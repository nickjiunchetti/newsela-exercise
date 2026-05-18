import { tokenize, getNgrams, docFreq, DEFAULT_STOPWORDS } from './nlp'
import { Config } from './presets'

export interface Question {
  text: string
  percent_correct: number
}

export interface TermResult {
  term: string
  type: 'unigram' | 'bigram' | 'trigram' | 'fourgram' | 'fivegram'
  poorFreq: number
  goodFreq: number
  poorCount: number
  goodCount: number
  score: number
  association: 'poor' | 'good'
}

export interface AnalysisResult {
  poor: Question[]
  good: Question[]
  excluded: number
  terms: TermResult[]
}

export function analyze(questions: Question[], cfg: Config): AnalysisResult {
  const EPS = 1e-6

  const poor = questions.filter((q) => q.percent_correct < cfg.poorThreshold)
  const good = questions.filter((q) => q.percent_correct > cfg.goodThreshold)

  const stopwords = cfg.customStopwords.length
    ? new Set([...DEFAULT_STOPWORDS, ...cfg.customStopwords])
    : DEFAULT_STOPWORDS

  const getTerms = (q: Question) => {
    const tokens = tokenize(q.text, stopwords)
    const out: string[] = [...tokens]
    if (cfg.bigrams) out.push(...getNgrams(tokens, 2))
    if (cfg.trigrams) out.push(...getNgrams(tokens, 3))
    if (cfg.fourgrams) out.push(...getNgrams(tokens, 4))
    if (cfg.fivegrams) out.push(...getNgrams(tokens, 5))
    return out
  }

  const poorFreqs = docFreq(poor, getTerms)
  const goodFreqs = docFreq(good, getTerms)

  const allTerms = new Set([...poorFreqs.keys(), ...goodFreqs.keys()])

  const terms: TermResult[] = []

  for (const term of allTerms) {
    const pc = poorFreqs.get(term) ?? 0
    const gc = goodFreqs.get(term) ?? 0

    if (pc + gc < cfg.minAppearances) continue

    const pf = pc / poor.length
    const gf = gc / good.length
    const score = Math.log((pf + EPS) / (gf + EPS))
    const words = term.split(' ').length

    terms.push({
      term,
      type: words === 1 ? 'unigram' : words === 2 ? 'bigram' : words === 3 ? 'trigram' : words === 4 ? 'fourgram' : 'fivegram',
      poorFreq: pf,
      goodFreq: gf,
      poorCount: pc,
      goodCount: gc,
      score,
      association: score >= 0 ? 'poor' : 'good',
    })
  }

  terms.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))

  return {
    poor,
    good,
    excluded: questions.length - poor.length - good.length,
    terms,
  }
}
