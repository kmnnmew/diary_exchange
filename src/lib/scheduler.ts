// Dev-only scheduler helper
// Usage in browser console:
//   window.triggerFallbacksNow()   → runs processAIFallbacks immediately
//   window.triggerAIFallback(id)   → triggers fallback for a specific diary

import { processAIFallbacks, triggerAIFallbackNow } from './ai'

export async function triggerFallbacksNow(): Promise<void> {
  console.log('[scheduler] Manually triggering AI fallbacks…')
  await processAIFallbacks()
  console.log('[scheduler] Done.')
}

if (typeof window !== 'undefined') {
  ;(window as any).triggerFallbacksNow = triggerFallbacksNow
  ;(window as any).triggerAIFallback   = triggerAIFallbackNow
}
