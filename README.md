# Question Frequency Analysis

Identifies words and phrases that correlate with student performance on a language learning platform.

## Running

```bash
npm install
```

### Script (required output)

Prints two ranked tables to the terminal: top 30 terms associated with poor performance and top 30 associated with good performance.

```bash
npm run report
```

### Interactive dashboard (extra, dynamic output table)

Opens a React dashboard at `http://localhost:5173` with live controls for thresholds, n-gram sizes, custom stopwords, and a filterable/sortable results table with pagination.

```bash
npm run dev
```

---

## Method

Questions are split into two buckets (**poor** and **good**) based on configurable `percent_correct` thresholds. The core metric is a **log-odds ratio**:

```
score = log( (term_freq_in_poor + e) / (term_freq_in_good + e) )
```

A positive score means the term appears more frequently in poor-performing questions; negative means good-performing. `e = 1e-6` prevents `log(0)` when a term only appears in one bucket.

**Why log-odds ratio?** A few other methods were considered:

| Method                      | Why not chosen                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw frequency ratio         | Dominated by bucket size imbalance (good is ~2× larger)                                                                                                    |
| Chi-square / Fisher's exact | Produce p-values useful for significance testing, but not great for ranking. Fisher's exact is also expensive at ~10K questions × thousands of terms       |
| TF-IDF                      | Designed for document retrieval, not for comparing two corpora against each other                                                                          |
| Log-odds ratio              | Handles bucket size asymmetry naturally, symmetric around zero, cheap to compute, and standard in corpus linguistics for this kind of contrastive analysis |

Frequency is **normalised by bucket size**: we count how many questions in a bucket contain the term, divided by the total questions in that bucket. Without this, the larger good bucket (roughly 2x the size of poor) would dominate raw counts.

**Document frequency** is used rather than raw occurrence count, so a verbose question that repeats a word many times does not skew results.

---

## Text Cleaning

Applied before tokenisation:

- HTML tags stripped (inner text kept)
- Lowercased
- Punctuation removed, hyphens and apostrophes within words preserved (`t-cell`, `author's`)
- Pure digit tokens removed; mixed alphanumeric tokens kept (`3-d`, `co2`)
- Whitespace normalised
- Common English stopwords removed
- Custom stopwords configurable at runtime via the dashboard

---

## Thresholds & Presets

Questions below `poorThreshold` are classified as **poor** and questions above `goodThreshold` are classified as **good**. Questions between the two thresholds are excluded. This gap is intentional, removing ambiguous middle-range questions produces cleaner signal.

| Preset      | Poor  | Good  | Excluded | Notes                                    |
| ----------- | ----- | ----- | -------- | ---------------------------------------- |
| Baseline    | < 0.5 | > 0.5 | 57       | 57 questions at exactly 0.5 are excluded |
| Strict Gap  | < 0.4 | > 0.6 | 4,071    | Middle removed for cleaner signal        |
| High Signal | < 0.5 | > 0.5 | 57       | Min appearances raised to 20             |

---

## N-grams

Unigrams (single words) are always extracted. Bigrams (2-word phrases) and trigrams (3-word phrases) are enabled by default. 4-grams and 5-grams are available but off by default.

A **minimum appearances** filter (default: 10) requires a term to appear in at least N questions total before it is included. This prevents single article topic words from surfacing as false signals.

---

## Project Structure

```
src/
  analysis/       # NLP pipeline - no UI dependencies
    nlp.ts        # tokenisation, n-gram extraction, document frequency
    analyze.ts    # log-odds scoring, bucket splitting, result assembly
    presets.ts    # Config type and preset definitions
  App.tsx         # React dashboard
  main.tsx        # Vite entry point
  index.css       # Styles
data/
  quiz_questions.json
report.ts         # Standalone CLI script
```

---

## Expected vs Actual Results

### What we expected

**Poor performance** — higher-order reading skills requiring inference, synthesis, or evaluation:

> `infer`, `best supports`, `main idea`, `evidence`, `author's purpose`, `summarize`, `EXCEPT`, `imply`, `conclude`, `what does X mean`

**Good performance** — direct recall or literal comprehension:

> `according to`, `who`, `what happened`, `when`, `which sentence`, straightforward fact-retrieval wording

---

### Baseline (0.5 / 0.5, min 10)

3,231 poor · 6,903 good · 57 excluded · 2,280 terms

| Term                       | Type   | Score | Poor % | Good % |
| -------------------------- | ------ | ----- | ------ | ------ |
| claim made                 | 2-gram | +8.30 | 0.40%  | 0.00%  |
| kind evidence              | 2-gram | +8.13 | 0.34%  | 0.00%  |
| article contains idiomatic | 3-gram | +3.06 | 0.62%  | 0.03%  |
| contains idiomatic phrase  | 3-gram | +2.55 | 0.74%  | 0.06%  |
| idiomatic phrase           | 2-gram | +2.33 | 0.74%  | 0.07%  |
| describes structure        | 2-gram | +1.86 | 0.56%  | 0.09%  |
| author's claim             | 2-gram | +1.79 | 0.43%  | 0.07%  |
| statements best summarizes | 3-gram | -8.20 | 0.00%  | 0.36%  |
| according article why      | 3-gram | -2.01 | 0.09%  | 0.70%  |
| sentence uses word         | 3-gram | -2.01 | 0.00%  | 0.23%  |

### Strict Gap (0.4 / 0.6, min 10)

1,444 poor · 4,676 good · 4,071 excluded · 1,332 terms

Removing the ambiguous middle sharpens the idiomatic language signal significantly — the score jumps from 3.06 to 9.49. Text structure (`overall structure text`, `structure text`) becomes more prominent. On the good side, `according article why` becomes the top signal (-8.83), confirming that "why" questions framed as direct recall are consistently easy.

| Term                       | Type   | Score | Poor % | Good % |
| -------------------------- | ------ | ----- | ------ | ------ |
| article contains idiomatic | 3-gram | +9.49 | 1.32%  | 0.00%  |
| contains idiomatic phrase  | 3-gram | +4.22 | 1.45%  | 0.02%  |
| overall structure text     | 3-gram | +3.37 | 0.62%  | 0.02%  |
| phrase means               | 2-gram | +2.97 | 2.49%  | 0.13%  |
| according article why      | 3-gram | -8.83 | 0.09%  | 0.68%  |
| statements best summarizes | 3-gram | -8.41 | 0.00%  | 0.45%  |
| sentence uses word         | 3-gram | -8.07 | 0.00%  | 0.32%  |

### High Signal (0.5 / 0.5, min 20)

3,231 poor · 6,903 good · 57 excluded · 1,026 terms

Raising the minimum appearances to 20 removes low-frequency noise and surfaces only the most recurring patterns. Two new signals emerge: `figure speech` (figurative language) and `antonym word` (vocabulary), both consistently hard. The good side clears up too — topic-specific proper nouns drop out and what remains are genuine question-structure patterns like `most clearly` and `following regarding`.

| Term                       | Type   | Score | Poor % | Good % |
| -------------------------- | ------ | ----- | ------ | ------ |
| article contains idiomatic | 3-gram | +3.06 | 0.62%  | 0.03%  |
| describes structure        | 2-gram | +1.86 | 0.56%  | 0.09%  |
| figure speech              | 2-gram | +1.45 | 0.43%  | 0.10%  |
| antonym word               | 2-gram | +1.43 | 0.43%  | 0.10%  |
| statements best summarizes | 3-gram | -8.20 | 0.00%  | 0.36%  |
| most clearly               | 2-gram | -1.49 | 0.06%  | 0.28%  |
| following regarding        | 2-gram | -1.47 | 0.09%  | 0.41%  |

---

### Conclusions

The poor side is consistent across all three presets. The same skill categories surface regardless of threshold settings, which gives confidence the signals are real:

1. **Idiomatic language** — the single strongest and most unexpected finding. Questions asking students to identify or interpret idiomatic phrases (`contains idiomatic phrase`, `phrase means`, `figure speech`) are consistently the hardest.
2. **Text structure** — `describes structure`, `overall structure text`. Questions about how a passage is organised are persistently hard.
3. **Claims and evidence** — `author's claim`, `claim made`, `kind evidence`. Questions requiring students to evaluate argumentation are hard, confirming the expected list.
4. **Figurative language and vocabulary** — `figure speech` and `antonym word` emerge in the High Signal preset, suggesting these question types also cluster on the hard side.

The good side confirms direct recall, but with a couple of surprises. `according article why` is the top good signal in Strict Gap — "why" questions in this dataset are framed as direct recall, not inference. `statements best summarizes` being a strong good signal was also unexpected; summarisation at this level appears straightforward for students. The good side is noisier overall: topic-specific proper nouns (`minecraft`, `oarfish`, `whooping cranes`) pollute the signal at lower `minAppearances` thresholds, reflecting easy article topics rather than question type.

The Strict Gap preset gives the cleanest signal for the poor side. Removing ambiguous middle questions nearly triples the idiomatic language score. The High Signal preset is most useful for identifying cross-article, curriculum-level patterns that survive stricter frequency requirements.

### Caveats

- **Good bucket is 2x larger than poor.** Most questions are answered correctly. Normalised frequency corrects for this, but the good side has more statistical power.
- **Topic noise on the good side.** Easy questions cluster around specific article topics (e.g. Minecraft, wildlife). At low `minAppearances`, topic-specific proper nouns surface as false "easy" signals. The High Signal preset mitigates this.
- **N-gram overlap.** `idiomatic phrase` (2-gram) and `contains idiomatic phrase` (3-gram) both appear. They reinforce each other but are not independent signals.

---

## Next Steps

- **Better metadata.** The biggest gap is that we have no topic labels. Right now the good side is polluted by easy questions about specific article topics (Minecraft, wildlife) which look like signals but aren't. Topic tags, question type labels (recall, inference, evaluation), or Common Core standard alignment would all help — any of them would let us separate what kind of question is hard from what topic it happens to cover.
- **AI-inferred topic tags.** If topic tags don't exist in the source system, a language model could classify each question. It's doable, but at ~10K questions the token cost adds up fast.
- **Lemmatisation / stemming.** `argue`, `argues`, and `argument` currently count separately. Collapsing inflections would strengthen the signal for morphologically rich terms.
- **Per-student data.** With individual response data, the analysis could identify not just hard question types but which student segments struggle with which concepts.
