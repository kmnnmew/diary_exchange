import { supabase } from './supabase'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

// ── Generate AI comment via OpenAI (friend persona) ────────────────────────
async function generateAIComment(diaryContent: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.log('[AI fallback] No VITE_OPENAI_API_KEY — using placeholder reply')
    return '읽어주셔서 감사해요. 당신의 하루가 담긴 이 글을 정성껏 읽었습니다. 힘든 일도, 기쁜 일도 모두 소중한 경험이에요. 앞으로도 소중한 하루하루를 기록해 주세요.'
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '당신은 따뜻하고 공감 능력이 뛰어난 친구입니다. 상대방의 일기를 읽고 진심 어린 답장을 한국어로 작성해주세요. 답장은 50~150자 사이로, 일기 내용에 공감하며 구체적으로 언급해주세요. 반드시 한국어로만 답장하세요.',
        },
        {
          role: 'user',
          content: diaryContent,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const json = await response.json()
  const text: string | undefined = json.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned empty response')
  return text
}

// ── Core: insert AI comment + mark diary completed + notify author ──────────
// NOTE: RLS constraints apply when called from the client:
//   • author_id on the comment must equal auth.uid() (RLS for INSERT on comments)
//   • Diary UPDATE is allowed only if current user owns the diary (or RLS permits)
//   • Notification INSERT for another user will fail on the client — non-fatal
// For production cross-user processing, invoke this from a Supabase Edge Function
// using the service-role key.
async function applyAIFallback(diary: {
  id: string
  author_id: string
  content: string
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('[AI fallback] Not authenticated')

  const commentText = await generateAIComment(diary.content)

  // Insert AI-generated comment
  // author_id = current user (satisfies RLS: auth.uid() = author_id)
  // is_ai_generated = true distinguishes it from human replies in the UI
  const { error: commentError } = await supabase.from('comments').insert({
    diary_id: diary.id,
    author_id: user.id,
    content: commentText,
    is_ai_generated: true,
  })
  if (commentError) throw commentError

  // Mark the diary as completed
  const { error: statusError } = await supabase
    .from('diaries')
    .update({ status: 'completed' })
    .eq('id', diary.id)
  if (statusError) throw statusError

  // Notify the diary author
  // Self-notification (user_id = auth.uid()) is likely permitted by RLS.
  // Cross-user notification (author ≠ current user) requires service role —
  // wrap in try/catch so failures are non-fatal.
  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: diary.author_id,
    type: 'ai',
    message: '24시간 내 응답이 없어 AI가 대신 답장을 작성했습니다.',
    is_read: false,
  })
  if (notifError) {
    console.warn(
      '[AI fallback] Notification insert failed (may need server-side privileges):',
      notifError.message,
    )
  }
}

// ── Check all waiting diaries older than 24 h → generate AI reply ──────────
// Due to client-side RLS, this only processes diaries owned by the currently
// authenticated user. For a full production sweep across all users, deploy a
// Supabase Edge Function scheduled with pg_cron and the service-role key.
export async function checkAndSendAIFallbacks(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Left-join comments to find diaries with no replies yet
  const { data: diaries, error } = await supabase
    .from('diaries')
    .select('id, author_id, content, comments!left(id)')
    .eq('exchange_mode', 'anonymous')
    .eq('status', 'waiting')
    .lt('created_at', cutoff)

  if (error) {
    console.error('[AI fallback] Error querying diaries:', error.message)
    return
  }

  // Filter client-side: only diaries with zero comments
  const unmatched = (diaries ?? []).filter(
    (d: any) => !d.comments || d.comments.length === 0,
  )

  console.log(
    `[AI fallback] ${unmatched.length} unmatched diary/diaries older than 24 h`,
  )

  for (const diary of unmatched) {
    try {
      await applyAIFallback(diary)
      console.log(`[AI fallback] ✓ AI reply sent for diary ${diary.id}`)
    } catch (err: any) {
      console.error(
        `[AI fallback] ✗ Failed for diary ${diary.id}:`,
        err?.message ?? err,
      )
    }
  }
}

// ── Dev/test helper: immediately trigger AI fallback (no 24 h check) ────────
// Usage from browser console:
//   await window.triggerAIFallback('paste-diary-uuid-here')
export async function triggerAIFallbackNow(diaryId: string): Promise<void> {
  console.log(`[AI fallback] triggerAIFallbackNow → diary: ${diaryId}`)

  const { data: diary, error } = await supabase
    .from('diaries')
    .select('id, author_id, content')
    .eq('id', diaryId)
    .single()

  if (error || !diary) {
    console.error('[AI fallback] Could not fetch diary:', error?.message)
    return
  }

  try {
    await applyAIFallback(diary)
    console.log(`[AI fallback] ✓ Done for diary ${diaryId}`)
  } catch (err: any) {
    console.error(
      `[AI fallback] ✗ Failed for diary ${diaryId}:`,
      err?.message ?? err,
    )
  }
}

// ── Expose to browser console for development testing ──────────────────────
if (typeof window !== 'undefined') {
  ;(window as any).triggerAIFallback = triggerAIFallbackNow
}
