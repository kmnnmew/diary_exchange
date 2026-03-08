import { openai } from './openai'

// ── Pattern-based filtering (synchronous, instant) ─────────────────────────
const OFFENSIVE_PATTERNS = [
  /[씨시]\s*[바발]/,
  /[개걔]\s*[새색]/,
  /미\s*친/,
  /병\s*신/,
  /바\s*보/,
  /ㅅㅂ|ㅂㅅ|ㅈㄴ|ㅈㄹ/,
  /자\s*살\s*방\s*법|자\s*해\s*방\s*법/,
  /섹\s*스|야\s*동|포\s*르/,
]

export function checkInappropriateContent(text: string): boolean {
  return OFFENSIVE_PATTERNS.some((p) => p.test(text))
}

export function hasRepetitiveChars(text: string): boolean {
  if (/(.)\1{4,}/.test(text)) return true
  const cleanText = text.replace(/\s/g, '')
  if (!cleanText.length) return false
  const jamo = cleanText.match(/[ㄱ-ㅎㅏ-ㅣ]/g) || []
  return jamo.length > 0 && jamo.length / cleanText.length > 0.5
}

// ── AI-powered moderation (async, optional) ────────────────────────────────
// Used as a second-pass check before DB insert when VITE_OPENAI_API_KEY is set.
export async function moderateWithAI(
  text: string
): Promise<{ safe: boolean; reason: string }> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return { safe: true, reason: 'AI moderation unavailable' }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a content moderator for a Korean diary-sharing platform. ' +
            'Respond ONLY with valid JSON: {"safe": boolean, "reason": string}. ' +
            'Mark as unsafe if the content contains hate speech, violence, explicit sexual content, or self-harm instructions.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature: 0,
    })

    const raw = response.choices[0].message.content || '{"safe":true,"reason":""}'
    return JSON.parse(raw) as { safe: boolean; reason: string }
  } catch {
    // If AI call fails, default to safe to avoid blocking users
    return { safe: true, reason: 'AI moderation unavailable' }
  }
}

// ── Combined validation — call this before writing to DB ──────────────────
export async function validateContent(
  text: string
): Promise<{ safe: boolean; reason: string }> {
  // 1. Fast synchronous pattern check
  if (checkInappropriateContent(text)) {
    return { safe: false, reason: '부적절한 표현이 감지되었습니다.' }
  }
  if (hasRepetitiveChars(text)) {
    return { safe: false, reason: '의미 없는 반복 문자가 감지되었습니다.' }
  }

  // 2. Optional AI check (only when key is present)
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return moderateWithAI(text)
  }

  return { safe: true, reason: '' }
}
