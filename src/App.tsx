import { useEffect, useMemo, useRef, useState } from 'react'
import rawQuestions from '../data/quiz_questions.json'
import { analyze, TermResult } from './analysis/analyze'
import { Config, PRESETS } from './analysis/presets'

const questions = rawQuestions.map((q) => ({
  text: q.text,
  percent_correct: q.percent_correct,
}))

type Filter = 'all' | 'poor' | 'good'
type SortKey = keyof Pick<
  TermResult,
  | 'term'
  | 'type'
  | 'association'
  | 'score'
  | 'poorFreq'
  | 'goodFreq'
  | 'poorCount'
  | 'goodCount'
>

const TYPE_LABEL: Record<string, string> = {
  unigram: '1-gram',
  bigram: '2-gram',
  trigram: '3-gram',
  fourgram: '4-gram',
  fivegram: '5-gram',
}
const TYPE_CLASS: Record<string, string> = {
  unigram: 'badge-word',
  bigram: 'badge-bigram',
  trigram: 'badge-trigram',
  fourgram: 'badge-fourgram',
  fivegram: 'badge-fivegram',
}

const COLS: { key: SortKey; label: string; sub: string; title?: string }[] = [
  { key: 'term',        label: 'Term',            sub: '',              title: 'The word or phrase extracted from question text' },
  { key: 'type',        label: 'N-gram',          sub: 'size',         title: '1-gram = single word, 2-gram = two consecutive words, etc.' },
  { key: 'association', label: 'Student perf.',   sub: 'on this term', title: 'Whether this term appears more often in questions students struggle with or answer easily' },
  { key: 'score',       label: 'Log-odds',        sub: 'score',        title: 'log(poor freq / good freq). Positive = more common in poor questions. Larger absolute value = stronger signal.' },
  { key: 'poorFreq',    label: 'Freq in poor',    sub: '% of bucket',  title: '% of poorly-answered questions that contain this term' },
  { key: 'goodFreq',    label: 'Freq in good',    sub: '% of bucket',  title: '% of well-answered questions that contain this term' },
  { key: 'poorCount',   label: 'Poor questions',  sub: 'containing term', title: 'Raw count of poorly-answered questions that contain this term' },
  { key: 'goodCount',   label: 'Good questions',  sub: 'containing term', title: 'Raw count of well-answered questions that contain this term' },
]

export default function App() {
  const [config, setConfig] = useState<Config>(PRESETS[0].config)
  const [activePreset, setActivePreset] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [stopwordInput, setStopwordInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = useMemo(() => analyze(questions, config), [config])

  function applyPreset(i: number) {
    setActivePreset(i)
    setConfig(PRESETS[i].config)
    setFilter('all')
  }

  function patchConfig(patch: Partial<Config>) {
    setActivePreset(-1)
    setConfig((c) => ({ ...c, ...patch }))
  }

  function patchConfigDebounced(patch: Partial<Config>) {
    setActivePreset(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => patchConfig(patch), 300)
  }

  function addStopword() {
    const word = stopwordInput.trim().toLowerCase()
    if (!word || config.customStopwords.includes(word)) return
    patchConfig({ customStopwords: [...config.customStopwords, word] })
    setStopwordInput('')
  }

  function removeStopword(word: string) {
    patchConfig({ customStopwords: config.customStopwords.filter((w) => w !== word) })
  }

  function handleSort(key: SortKey) {
    setSortDir(key === sortKey ? (sortDir === -1 ? 1 : -1) : -1)
    setSortKey(key)
  }

  const displayed = useMemo(() => {
    const filtered =
      filter === 'all'
        ? result.terms
        : result.terms.filter((t) => t.association === filter)
    return [...filtered].sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey]
      return typeof av === 'string'
        ? sortDir * av.localeCompare(bv as string)
        : sortDir * ((av as number) - (bv as number))
    })
  }, [result.terms, filter, sortKey, sortDir])

  // Reset to first page whenever the list content changes
  useEffect(() => {
    setPage(0)
  }, [displayed])

  const totalPages = Math.ceil(displayed.length / pageSize)
  const paginated = displayed.slice(page * pageSize, (page + 1) * pageSize)

  const maxAbs = result.terms.reduce((m, t) => Math.max(m, Math.abs(t.score)), 1)

  return (
    <div className='layout'>
      <header className='header'>
        <h1 className='header-title'>Question Frequency Analysis</h1>
        <div className='header-divider' />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Newsela · {questions.length.toLocaleString()} questions
        </span>
      </header>
      <aside className='sidebar'>
        <div>
          <div className='sidebar-section-title'>Presets</div>
          <div className='presets'>
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                className={`preset-btn${activePreset === i ? ' active' : ''}`}
                onClick={() => applyPreset(i)}
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className='sidebar-section-title'>Thresholds</div>
          <div className='controls-grid'>
            {(
              [
                ['poorThreshold', 'Poor (<)'],
                ['goodThreshold', 'Good (>'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className='control-group'>
                <label className='control-label'>{label}</label>
                <input
                  type='number'
                  className='control-input'
                  min={0}
                  max={1}
                  step={0.05}
                  value={config[key]}
                  onChange={(e) =>
                    patchConfigDebounced({ [key]: parseFloat(e.target.value) })
                  }
                />
              </div>
            ))}
            <div className='control-group'>
              <label className='control-label'>Min appearances</label>
              <input
                type='number'
                className='control-input'
                min={1}
                max={200}
                step={1}
                value={config.minAppearances}
                onChange={(e) =>
                  patchConfigDebounced({ minAppearances: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <div className='sidebar-section-title'>N-grams</div>
          <p className='sidebar-hint'>The number of words in a term.</p>
          <div className='ngram-checks'>
            {(['bigrams', 'trigrams', 'fourgrams', 'fivegrams'] as const).map(
              (key) => (
                <label key={key} className='check-label'>
                  <input
                    type='checkbox'
                    checked={config[key]}
                    onChange={(e) => patchConfig({ [key]: e.target.checked })}
                  />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ),
            )}
          </div>
        </div>

        <div>
          <div className='sidebar-section-title'>Stopwords</div>
          <p className='sidebar-hint'>Words excluded from analysis. Add domain-specific terms to filter them out.</p>
          <div className='stopword-input-row'>
            <input
              className='control-input'
              placeholder='e.g. idiomatic'
              value={stopwordInput}
              onChange={(e) => setStopwordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStopword()}
            />
            <button className='stopword-add-btn' onClick={addStopword}>+</button>
          </div>
          {config.customStopwords.length > 0 && (
            <div className='stopword-chips'>
              {config.customStopwords.map((w) => (
                <span key={w} className='stopword-chip'>
                  {w}
                  <button onClick={() => removeStopword(w)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className='sidebar-section-title'>Dataset</div>
          <div className='stats'>
            {(
              [
                ['Poor', 'poor', result.poor.length],
                ['Good', 'good', result.good.length],
                ['Excluded', 'excl', result.excluded],
                ['Terms', 'terms', result.terms.length],
              ] as const
            ).map(([label, cls, value]) => (
              <div key={label} className='stat-row'>
                <span className='stat-label'>{label}</span>
                <span className={`stat-value ${cls}`}>
                  {value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className='main'>
        <section className='card'>
          <div className='card-header'>
            <span className='card-title'>Word &amp; Phrase Associations</span>
            <div className='filter-group'>
              {(['all', 'poor', 'good'] as Filter[]).map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${f}${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <span className='card-count'>{displayed.length} terms</span>
          </div>

          {displayed.length === 0 ? (
            <div className='empty-state'>No terms match current filters.</div>
          ) : (
            <div className='table-wrap'>
              <table className='table'>
                <thead>
                  <tr>
                    {COLS.map(({ key, label, sub, title }) => (
                      <th
                        key={key}
                        className={sortKey === key ? 'sorted' : ''}
                        onClick={() => handleSort(key)}
                        title={title}
                      >
                        <span className='th-main'>{label}</span>
                        {sub && <span className='th-sub'>{sub}</span>}
                        <span className='sort-icon'>
                          {sortKey === key ? (sortDir === -1 ? '↓' : '↑') : '↕'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => (
                    <tr key={t.term}>
                      <td className='term-cell'>{t.term}</td>
                      <td>
                        <span className={`badge ${TYPE_CLASS[t.type]}`}>
                          {TYPE_LABEL[t.type]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${t.association}`}>
                          {t.association === 'poor' ? 'struggles' : 'excels'}
                        </span>
                      </td>
                      <td className='score-cell'>
                        <div className='score-wrap'>
                          <div
                            className={`score-bar score-bar-${t.association}`}
                            style={{
                              width: Math.round(
                                (Math.abs(t.score) / maxAbs) * 72,
                              ),
                            }}
                          />
                          <span className='score-num'>
                            {t.score.toFixed(3)}
                          </span>
                        </div>
                      </td>
                      <td className='mono'>{(t.poorFreq * 100).toFixed(2)}%</td>
                      <td className='mono'>{(t.goodFreq * 100).toFixed(2)}%</td>
                      <td className='mono'>{t.poorCount}</td>
                      <td className='mono'>{t.goodCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {displayed.length > 0 && (
            <div className='pagination'>
              <span className='page-info'>
                {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, displayed.length)} of{' '}
                {displayed.length}
              </span>
              <div className='page-size-group'>
                {[25, 50, 100].map((n) => (
                  <button
                    key={n}
                    className={`page-size-btn${pageSize === n ? ' active' : ''}`}
                    onClick={() => {
                      setPageSize(n)
                      setPage(0)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className='page-nav'>
                <button
                  className='page-btn'
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                >
                  «
                </button>
                <button
                  className='page-btn'
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  ‹
                </button>
                <span className='page-current'>
                  {page + 1} / {totalPages}
                </span>
                <button
                  className='page-btn'
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  ›
                </button>
                <button
                  className='page-btn'
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
