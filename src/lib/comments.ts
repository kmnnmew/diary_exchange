import { supabase } from './supabase'
import { validateContent } from './moderation'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReceivedDiary {
  match: {
    id: string
    diary_id: string
    sender_id: string
    status: string
    created_at: string
  }
  diary: {
    id: string
    title: string | null
    content: string
    emotion: string | null
    paper_design: string | null
    stamp: string | null
    created_at: string
    created_date: string
  }
}

// ── Get oldest pending diary assigned to this user as receiver ─────────────
export async function getReceivedDiary(
  userId: string
): Promise<ReceivedDiary | null> {
  const { data, error } = await supabase
    .from('diary_matches')
    .select(`
      id,
      diary_id,
      sender_id,
      status,
      created_at,
      diaries!diary_id (
        id,
        title,
        content,
        emotion,
        paper_design,
        stamp,
        created_at,
        created_date
      )
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  console.log('[DEBUG getReceivedDiary] raw data:', data, 'error:', error)
  if (error) throw error
  if (!data) {
    console.log('[DEBUG getReceivedDiary] → no match row found')
    return null
  }

  // Supabase returns the joined row as 'diaries' (singular, many-to-one FK)
  const diaryData = (data as any).diaries
  console.log('[DEBUG getReceivedDiary] diaryData:', diaryData)
  if (!diaryData) {
    console.log('[DEBUG getReceivedDiary] → diary join returned null (RLS blocked read?)')
    return null
  }

  return {
    match: {
      id: data.id,
      diary_id: data.diary_id,
      sender_id: data.sender_id,
      status: data.status,
      created_at: data.created_at,
    },
    diary: {
      id: diaryData.id,
      title: diaryData.title,
      content: diaryData.content,
      emotion: diaryData.emotion,
      paper_design: diaryData.paper_design,
      stamp: diaryData.stamp,
      created_at: diaryData.created_at,
      created_date: diaryData.created_date,
    },
  }
}

// ── Submit a comment on a received diary ───────────────────────────────────
// Flow:
//   1. Validate content (length + moderation)
//   2. Insert comment row  (comments.diary_id links it; no match_id col in schema)
//   3. Flip diary_matches.status → 'commented'
//   4. DB trigger handle_match_commented fires:
//        - marks diaries.status = 'completed'
//        - inserts notification for the sender (SECURITY DEFINER, bypasses RLS)
export async function submitComment(params: {
  diaryId: string
  matchId: string
  content: string
  authorId: string
}): Promise<string> {
  // 1. Length check
  if (params.content.length < 30) {
    throw new Error('최소 30자 이상 작성해주세요.')
  }

  // 2. Pattern + optional AI moderation
  const { safe, reason } = await validateContent(params.content)
  if (!safe) throw new Error(reason)

  // 3. Insert comment
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .insert({
      diary_id: params.diaryId,
      author_id: params.authorId,
      content: params.content,
      is_ai_generated: false,
    })
    .select('id')
    .single()

  if (commentError) throw commentError

  // 4. Update match status → 'commented'
  //    RLS: receiver_id = auth.uid() is satisfied
  //    Trigger will handle diary + notification side-effects
  const { error: matchError } = await supabase
    .from('diary_matches')
    .update({ status: 'commented' })
    .eq('id', params.matchId)
    .eq('receiver_id', params.authorId) // ensures RLS safety

  if (matchError) throw matchError

  return comment.id
}
