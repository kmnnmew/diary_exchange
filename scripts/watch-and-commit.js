import { watch } from 'fs'
import { execSync } from 'child_process'

let timer
watch('./src', { recursive: true }, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      execSync('git add -A')
      execSync(`git commit -m "auto: ${new Date().toISOString()}"`)
      execSync('git push origin main')
      console.log('✓ auto-committed and pushed')
    } catch (e) {
      console.log('nothing to commit')
    }
  }, 15000)
})
