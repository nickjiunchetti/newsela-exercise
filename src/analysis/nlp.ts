export const DEFAULT_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'it',
  'its',
  's',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'what',
  'which',
  'who',
  'how',
  'when',
  'where',
  'not',
  'if',
  'no',
  'so',
  'as',
  'up',
  'out',
  'about',
  'into',
  'then',
  'than',
  'also',
  'more',
  'one',
  'two',
  'all',
  'any',
  'some',
  'each',
  'both',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'our',
  'their',
])

export function tokenize(text: string, stopwords: Set<string> = DEFAULT_STOPWORDS): string[] {
  return text
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 1 && !stopwords.has(w) && !/^\d+$/.test(w))
}

export function getNgrams(tokens: string[], n: number): string[] {
  const out: string[] = []
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n)
    if (gram.every(Boolean)) out.push(gram.join(' '))
  }
  return out
}

export function docFreq<T>(
  items: T[],
  getTerms: (item: T) => string[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    for (const t of new Set(getTerms(item))) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return map
}
