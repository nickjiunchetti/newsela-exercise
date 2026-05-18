import questions from './data/quiz_questions.json' assert { type: 'json' }
import { analyze } from './src/analysis/analyze'
import { PRESETS } from './src/analysis/presets'

const config = PRESETS[0].config
const result = analyze(questions, config)

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

function printTable(terms: typeof result.terms) {
  const COL = { term: 36, type: 8, score: 8, poorFreq: 8, goodFreq: 8, n: 6 }
  const header = [
    pad('TERM', COL.term),
    pad('TYPE', COL.type),
    pad('SCORE', COL.score),
    pad('POOR%', COL.poorFreq),
    pad('GOOD%', COL.goodFreq),
    pad('N', COL.n),
  ].join('  ')
  const sep = Object.values(COL).map((w) => '-'.repeat(w)).join('--')
  console.log(header)
  console.log(sep)
  for (const t of terms) {
    console.log([
      pad(t.term, COL.term),
      pad(t.type, COL.type),
      t.score.toFixed(3).padStart(COL.score),
      `${(t.poorFreq * 100).toFixed(2)}%`.padStart(COL.poorFreq),
      `${(t.goodFreq * 100).toFixed(2)}%`.padStart(COL.goodFreq),
      String(t.poorCount + t.goodCount).padStart(COL.n),
    ].join('  '))
  }
}

// ── output ────────────────────────────────────────────────────────────────────

console.log('\n=== Question Frequency Analysis ===')
console.log(`Dataset : ${questions.length.toLocaleString()} questions`)
console.log(`Poor    : ${result.poor.length.toLocaleString()} (< ${config.poorThreshold})`)
console.log(`Good    : ${result.good.length.toLocaleString()} (> ${config.goodThreshold})`)
console.log(`Excluded: ${result.excluded.toLocaleString()}`)
console.log(`Terms   : ${result.terms.length.toLocaleString()}\n`)

console.log('── Top 30: associated with POOR performance ──')
printTable(result.terms.filter((t) => t.association === 'poor').slice(0, 30))

console.log('\n── Top 30: associated with GOOD performance ──')
printTable(result.terms.filter((t) => t.association === 'good').slice(0, 30))
