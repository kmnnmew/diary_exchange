import { supabase } from './supabase'
import { validateContent } from './moderation'

// ── Daily limit ────────────────────────────────────────────────────────────
// Returns true if the user has already submitted a diary in this mode today.
export async function checkDailyLimit(
  userId: string,
  mode: string
): Promise<boolean> {
  // Use KST date so the daily limit resets at midnight KST, not UTC
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const { count, error } = await supabase
    .from('diaries')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('exchange_mode', mode)
    .eq('created_date', today)

  if (error) throw error
  return (count ?? 0) > 0
}

// ── Submit + match ─────────────────────────────────────────────────────────
export async function submitAnonymousDiary(params: {
  title?: string
  content: string
  emotion?: string
  stamp?: string
  paperDesign: string
  userId: string
}): Promise<string> {
  // Server-side content validation before DB insert
  if (params.title) {
    const { safe, reason } = await validateContent(params.title)
    if (!safe) throw new Error(reason)
  }
  const { safe, reason } = await validateContent(params.content)
  if (!safe) throw new Error(reason)

  // Insert diary row — store KST date so queries by created_date match correctly
  const createdDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const { data: diary, error } = await supabase
    .from('diaries')
    .insert({
      author_id: params.userId,
      title: params.title || null,
      content: params.content,
      exchange_mode: 'anonymous',
      paper_design: params.paperDesign,
      stamp: params.stamp || null,
      emotion: params.emotion || null,
      status: 'waiting',
      created_date: createdDate,
    })
    .select('id')
    .single()

  if (error) throw error

  // Attempt matching; errors here must not block the user
  try {
    await matchAnonymousDiary(diary.id, params.userId)
  } catch (matchErr) {
    // Matching failure is non-fatal: diary is saved, will be retried or AI-fallback
    console.error('[DEBUG match] matchAnonymousDiary threw (caught by submitAnonymousDiary):', matchErr)
  }

  return diary.id
}

// ── Matching algorithm ─────────────────────────────────────────────────────
export async function matchAnonymousDiary(
  diaryId: string,
  senderId: string
): Promise<void> {
  // KST date for created_date comparisons; UTC range for created_at timestamp comparisons
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  // KST midnight = UTC 15:00 of the previous calendar day
  const kstMidnightUTC = new Date(`${today}T00:00:00+09:00`)
  const todayStart = kstMidnightUTC.toISOString()
  const todayEnd   = new Date(kstMidnightUTC.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()

  console.log('[DEBUG match] ── start ──────────────────────────────')
  console.log('[DEBUG match] diaryId  :', diaryId)
  console.log('[DEBUG match] senderId :', senderId)
  console.log('[DEBUG match] today    :', today)

  // 1. Sender's block list
  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', senderId)
  console.log('[DEBUG match] blocks error :', blocksError)
  const blockedIds = new Set((blocks ?? []).map((b: any) => b.blocked_id as string))
  console.log('[DEBUG match] blockedIds   :', [...blockedIds])

  // 2. Users who submitted an anonymous diary today (potential receivers)
  // Only include diaries still awaiting a match (status = 'waiting').
  // Diaries with status 'matched' or 'completed' already have a partner.
  const { data: candidates, error: candidatesError } = await supabase
    .from('diaries')
    .select('author_id')
    .eq('exchange_mode', 'anonymous')
    .eq('created_date', today)
    .neq('author_id', senderId)
    .eq('status', 'waiting')

  console.log('[DEBUG match] candidatesError :', candidatesError)
  console.log('[DEBUG match] candidates      :', candidates)

  if (!candidates || candidates.length === 0) {
    // No candidates yet — diary stays 'waiting' for up to 24 h.
    // checkAndSendAIFallbacks() (ai.ts) will generate an AI reply after 24 h if
    // no human match has arrived by then.
    console.log('[DEBUG match] → no candidates, diary stays waiting')
    return
  }

  // 3. Already-matched receivers today (prevent double-assignment)
  const { data: todayMatches, error: todayMatchesError } = await supabase
    .from('diary_matches')
    .select('receiver_id')
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
  console.log('[DEBUG match] todayMatchesError :', todayMatchesError)
  const todayReceiverIds = new Set(
    (todayMatches ?? []).map((m: any) => m.receiver_id as string)
  )
  console.log('[DEBUG match] todayReceiverIds  :', [...todayReceiverIds])

  // 4. Receivers from the last 7 days (for fair distribution — deprioritised)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: recentMatches } = await supabase
    .from('diary_matches')
    .select('receiver_id')
    .gte('created_at', weekAgo.toISOString())
  const recentReceiverIds = new Set(
    (recentMatches ?? []).map((m: any) => m.receiver_id as string)
  )

  // 5. Build eligible pool: not blocked, not already matched today
  const eligible = candidates
    .map((c: any) => c.author_id as string)
    .filter(id => !blockedIds.has(id) && !todayReceiverIds.has(id))

  console.log('[DEBUG match] eligible :', eligible)

  if (eligible.length === 0) {
    // All candidates already matched today — diary stays 'waiting'.
    // Will be retried on next submission or AI fallback after 24 h.
    console.log('[DEBUG match] → eligible is empty, diary stays waiting')
    return
  }

  // 6. Prefer users who haven't recently been a receiver (fairness)
  const priority = eligible.filter(id => !recentReceiverIds.has(id))
  const pool = priority.length > 0 ? priority : eligible
  const receiverId = pool[Math.floor(Math.random() * pool.length)]

  console.log('[DEBUG match] pool       :', pool)
  console.log('[DEBUG match] receiverId :', receiverId)

  // 7. Insert match record
  const { error: matchError } = await supabase.from('diary_matches').insert({
    diary_id:    diaryId,
    sender_id:   senderId,
    receiver_id: receiverId,
    status:      'pending',
  })
  console.log('[DEBUG match] INSERT diary_matches error :', matchError)
  if (matchError) throw matchError

  // 8. Promote diary status
  const { error: statusError } = await supabase
    .from('diaries')
    .update({ status: 'matched' })
    .eq('id', diaryId)
  console.log('[DEBUG match] UPDATE diary status error :', statusError)
  console.log('[DEBUG match] ── done ───────────────────────────────')

  // NOTE: Inserting a notification for the receiver (different user) requires
  // service-role privileges. This is handled by a Supabase DB trigger or
  // Edge Function in production. Skipped here to avoid RLS violation.
}
