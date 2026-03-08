// Supabase Edge Function: ai-fallback
// Runs on a cron schedule (daily ~08:10 KST) via Supabase Dashboard → Functions → Cron
// Also handles:
//  1. processAIScheduled   — deliver AI diary replies on the next KST morning
//  2. processGroupFallbacks — 24-hour fallback for anonymous + group diaries with no reply

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_KEY    = Deno.env.get('OPENAI_API_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Persona prompts ────────────────────────────────────────────────────────────
const PERSONA_PROMPTS: Record<string, string> = {
  friend:
    '당신은 따뜻하고 공감 능력이 뛰어난 친구입니다. 일기를 읽고 진심 어린 위로와 공감의 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
  observer:
    '당신은 냉철하고 객관적인 관찰자입니다. 일기를 읽고 감정에 치우치지 않는 분석적 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
  poet:
    '당신은 감성적인 시인입니다. 일기를 읽고 시적이고 아름다운 언어로 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
}

const FALLBACK_REPLIES: Record<string, string> = {
  friend:
    '오늘 하루도 정말 수고했어. 네 마음이 느껴져서 같이 마음이 따뜻해졌어. 내일은 더 좋은 날이 될 거야.',
  observer:
    '오늘의 일기에서 감정의 기복이 느껴집니다. 상황을 객관적으로 바라보면 더 나은 선택을 할 수 있을 것입니다.',
  poet:
    '그대의 하루는 한 편의 시였네. 슬픔도 기쁨도 모두 삶의 색깔—오늘도 아름다운 페이지를 썼네.',
  custom:
    '오늘의 일기 잘 읽었어요. 당신의 하루가 소중하게 느껴졌습니다. 내일도 힘내세요.',
}

// ── Call OpenAI via fetch ──────────────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, userContent: string): Promise<string> {
  if (!OPENAI_KEY) {
    console.warn('[ai-fallback] No OPENAI_API_KEY — using fallback text')
    return ''
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    console.error('[ai-fallback] OpenAI error:', res.status, await res.text())
    return ''
  }

  const json = await res.json()
  return (json.choices?.[0]?.message?.content ?? '').trim()
}

// ── Apply comment to a diary ───────────────────────────────────────────────────
async function applyComment(
  diary: { id: string; author_id: string; content: string },
  personaId: string,
  systemPrompt: string,
): Promise<void> {
  let commentText = await callOpenAI(
    systemPrompt,
    `일기:\n\n${diary.content}`,
  )

  if (!commentText) {
    commentText = FALLBACK_REPLIES[personaId] ?? FALLBACK_REPLIES['custom']
  }

  // Insert comment
  const { error: cErr } = await supabase.from('comments').insert({
    diary_id:        diary.id,
    author_id:       diary.author_id,
    content:         commentText,
    is_ai_generated: true,
    ai_persona:      personaId,
  })
  if (cErr) { console.error('[ai-fallback] comment insert error:', cErr); return }

  // Complete diary
  await supabase.from('diaries').update({ status: 'completed' }).eq('id', diary.id)

  // Notify author
  await supabase.from('notifications').insert({
    user_id:          diary.author_id,
    type:             'ai_comment',
    message:          'AI가 오늘의 일기에 답장을 남겼어요.',
    related_diary_id: diary.id,
    read:             false,
  })

  console.log(`[ai-fallback] Applied comment to diary ${diary.id} (persona: ${personaId})`)
}

// ── 1. Process scheduled AI diaries (next-day KST 08:00) ─────────────────────
async function processAIScheduled(): Promise<number> {
  // KST = UTC+9. "next day 08:00 KST" = "23:00 UTC of the same day the diary was created"
  // We deliver if created_at is earlier than (now - 23h), which covers the KST next-morning window.
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  const { data: diaries, error } = await supabase
    .from('diaries')
    .select('id, author_id, content')
    .eq('exchange_mode', 'ai')
    .eq('status', 'ai_scheduled')
    .lt('created_at', cutoff)

  if (error) { console.error('[ai-fallback] processAIScheduled query error:', error); return 0 }
  if (!diaries?.length) { console.log('[ai-fallback] No ai_scheduled diaries to process.'); return 0 }

  for (const diary of diaries) {
    // Fetch persona settings for this author
    const { data: settings } = await supabase
      .from('ai_persona_settings')
      .select('tone, system_prompt')
      .eq('user_id', diary.author_id)
      .maybeSingle()

    const personaId   = settings?.tone ?? 'friend'
    const systemPrompt = settings?.system_prompt || PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS['friend']

    await applyComment(diary, personaId, systemPrompt)
  }

  return diaries.length
}

// ── 2. Process anonymous + group 24-hour fallbacks ────────────────────────────
async function processGroupFallbacks(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: diaries, error } = await supabase
    .from('diaries')
    .select('id, author_id, content, exchange_mode, comments!left(id)')
    .in('exchange_mode', ['anonymous', 'group'])
    .in('status', ['waiting', 'ai_pending', 'matched'])
    .lt('created_at', cutoff)

  if (error) { console.error('[ai-fallback] processGroupFallbacks query error:', error); return 0 }
  if (!diaries?.length) { console.log('[ai-fallback] No group/anonymous diaries need fallback.'); return 0 }

  let count = 0
  for (const diary of diaries) {
    const comments = (diary.comments as any[]) ?? []
    if (comments.length > 0) continue  // already has a comment

    await applyComment(diary, 'friend', PERSONA_PROMPTS['friend'])
    count++
  }

  return count
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (_req: Request) => {
  console.log('[ai-fallback] Edge Function invoked')

  const [aiCount, fallbackCount] = await Promise.all([
    processAIScheduled(),
    processGroupFallbacks(),
  ])

  const result = {
    ok: true,
    ai_scheduled_processed: aiCount,
    fallbacks_applied: fallbackCount,
    ts: new Date().toISOString(),
  }

  console.log('[ai-fallback] Done:', result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
