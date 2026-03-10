import { openai } from './openai'
import { supabase } from './supabase'

// ── Persona metadata — single source of truth for id, label, description ─────
export const PERSONAS = [
  { id: 'friend',   label: '따뜻한 친구',   description: '공감과 위로를 주는 친구' },
  { id: 'observer', label: '냉철한 관찰자', description: '객관적인 시선으로 분석' },
  { id: 'poet',     label: '시인',          description: '감성적인 언어로 표현' },
] as const

// ── Persona system prompts ────────────────────────────────────────────────────
export const PERSONA_PROMPTS: Record<string, string> = {
  friend:
    '당신은 따뜻하고 공감 능력이 뛰어난 친구입니다. 일기를 읽고 진심 어린 위로와 공감의 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
  observer:
    '당신은 냉철하고 객관적인 관찰자입니다. 일기를 읽고 감정에 치우치지 않는 분석적 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
  poet:
    '당신은 감성적인 시인입니다. 일기를 읽고 시적이고 아름다운 언어로 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요.',
}

// ── Fallback replies (when API key is absent) ─────────────────────────────────
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

// ── Generate AI comment ───────────────────────────────────────────────────────
export async function generateAIComment(params: {
  diaryContent: string
  personaId: string
  customPrompt?: string
  isAutoFallback: boolean
}): Promise<string> {
  const { diaryContent, personaId, customPrompt, isAutoFallback } = params

  const systemPrompt =
    customPrompt ||
    PERSONA_PROMPTS[personaId] ||
    PERSONA_PROMPTS['friend']

  // No API client → return fallback text immediately
  if (!openai) {
    console.warn('[ai] No OpenAI client available, using fallback reply.')
    return FALLBACK_REPLIES[personaId] || FALLBACK_REPLIES['custom']
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: isAutoFallback
            ? `다음 일기에 코멘트를 작성해주세요:\n\n${diaryContent}`
            : `일기:\n\n${diaryContent}`,
        },
      ],
    })
    return (
      response.choices[0]?.message?.content?.trim() ??
      FALLBACK_REPLIES[personaId] ??
      FALLBACK_REPLIES['custom']
    )
  } catch (err) {
    console.error('[ai] OpenAI error:', err)
    return FALLBACK_REPLIES[personaId] || FALLBACK_REPLIES['custom']
  }
}

// ── Schedule AI comment (mark diary + persist persona choice) ─────────────────
export async function scheduleAIComment(
  diaryId: string,
  userId: string,
  personaId: string,
  customPrompt?: string
): Promise<void> {
  // Mark diary as ai_scheduled so the Edge Function picks it up next morning
  const { error: diaryErr } = await supabase
    .from('diaries')
    .update({ status: 'ai_scheduled' })
    .eq('id', diaryId)

  if (diaryErr) console.error('[ai] scheduleAIComment diary update error:', diaryErr)

  // Persist persona choice for this user
  const { error: personaErr } = await supabase
    .from('ai_persona_settings')
    .upsert(
      {
        user_id: userId,
        tone: personaId,
        system_prompt: customPrompt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (personaErr) console.error('[ai] scheduleAIComment persona upsert error:', personaErr)
}

// ── Apply AI comment to a single diary (private helper) ───────────────────────
async function applyAIComment(
  diary: {
    id: string
    author_id: string
    content: string
    exchange_mode: string
  },
  options?: {
    personaId?: string
    customPrompt?: string
  }
): Promise<void> {
  const personaId = options?.personaId ?? 'friend'
  const customPrompt = options?.customPrompt

  const commentText = await generateAIComment({
    diaryContent: diary.content,
    personaId,
    customPrompt,
    isAutoFallback: true,
  })

  // Insert AI comment
  const { error: commentErr } = await supabase.from('comments').insert({
    diary_id: diary.id,
    author_id: diary.author_id,
    content: commentText,
    is_ai_generated: true,
    ai_persona: personaId,
  })

  if (commentErr) {
    console.error('[ai] applyAIComment insert error:', commentErr)
    return
  }

  // Mark diary as completed
  const { error: updateErr } = await supabase
    .from('diaries')
    .update({ status: 'completed' })
    .eq('id', diary.id)

  if (updateErr) console.error('[ai] applyAIComment status update error:', updateErr)

  // Notify the author
  await supabase.from('notifications').insert({
    user_id: diary.author_id,
    type: 'ai_comment',
    message: 'AI가 오늘의 일기에 답장을 남겼어요.',
    related_diary_id: diary.id,
    read: false,
  })
}

// ── Process 24-hour AI fallbacks for anonymous + group diaries ────────────────
export async function processAIFallbacks(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: diaries, error } = await supabase
    .from('diaries')
    .select('id, author_id, content, exchange_mode, comments!left(id)')
    .in('exchange_mode', ['anonymous', 'group'])
    .in('status', ['waiting', 'ai_pending', 'matched'])
    .lt('created_at', cutoff)

  if (error) {
    console.error('[ai] processAIFallbacks query error:', error)
    return
  }

  if (!diaries || diaries.length === 0) {
    console.log('[ai] No diaries need AI fallback.')
    return
  }

  for (const diary of diaries) {
    const comments = (diary.comments as any[]) ?? []
    if (comments.length > 0) continue // already has a comment

    console.log(`[ai] Applying fallback to diary ${diary.id}`)
    await applyAIComment(diary)
  }

  console.log(`[ai] processAIFallbacks done. Processed ${diaries.length} candidate diaries.`)
}

// ── Backwards-compat alias ────────────────────────────────────────────────────
export async function checkAndSendAIFallbacks(): Promise<void> {
  return processAIFallbacks()
}

// ── Dev helper: trigger fallback for a specific diary immediately ─────────────
export async function triggerAIFallbackNow(diaryId: string): Promise<void> {
  const { data: diary, error } = await supabase
    .from('diaries')
    .select('id, author_id, content, exchange_mode')
    .eq('id', diaryId)
    .maybeSingle()

  if (error || !diary) {
    console.error('[ai] triggerAIFallbackNow: diary not found', error)
    return
  }

  await applyAIComment(diary)
  console.log(`[ai] triggerAIFallbackNow done for diary ${diaryId}`)
}

// ── Expose to browser console for dev testing ─────────────────────────────────
if (typeof window !== 'undefined') {
  ;(window as any).triggerAIFallback = triggerAIFallbackNow
  ;(window as any).processAIFallbacks = processAIFallbacks
}
