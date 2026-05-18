export interface Config {
  poorThreshold: number
  goodThreshold: number
  minAppearances: number
  bigrams: boolean
  trigrams: boolean
  fourgrams: boolean
  fivegrams: boolean
  customStopwords: string[]
}

export interface Preset {
  name: string
  description: string
  config: Config
}

export const PRESETS: Preset[] = [
  {
    name: 'Baseline',
    description: 'All questions split at 50%',
    config: {
      poorThreshold: 0.5,
      goodThreshold: 0.5,
      minAppearances: 10,
      bigrams: true,
      trigrams: true,
      fourgrams: false,
      fivegrams: false,
      customStopwords: [],
    },
  },
  {
    name: 'Strict Gap',
    description:
      'Excludes middle 40-60%, reduces ambiguous questions for cleaner signal',
    config: {
      poorThreshold: 0.4,
      goodThreshold: 0.6,
      minAppearances: 10,
      bigrams: true,
      trigrams: true,
      fourgrams: false,
      fivegrams: false,
      customStopwords: [],
    },
  },
  {
    name: 'High Signal',
    description: 'Requires 20+ appearances, shows only the strongest signals',
    config: {
      poorThreshold: 0.5,
      goodThreshold: 0.5,
      minAppearances: 20,
      bigrams: true,
      trigrams: true,
      fourgrams: false,
      fivegrams: false,
      customStopwords: [],
    },
  },
]
