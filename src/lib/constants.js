// Default dropdown options — can be customized via Settings page
export const DEFAULT_PAIRS = [
  'XAUUSD', 'GBPUSD', 'EURUSD', 'US100', 'US30', 'SP500'
];

export const DEFAULT_ACCOUNTS = [
  'ForTraders', 'BrightFunded 1', 'BrightFunded 2', 'BlueGuardian'
];

export const DEFAULT_FRAMEWORKS = ['GXT'];

export const DEFAULT_NARRATIVES = ['LIQ > IMB'];

export const DEFAULT_KEY_LEVELS = ['PDH'];

export const DEFAULT_ENTRY_MODELS = ['CISD'];

export const DEFAULT_CONFLUENCES = ['PSP', 'SMT', 'SSMT'];

export const DEFAULT_MISTAKES = ['None', 'Broke Rules'];

export const DIRECTIONS = ['Long', 'Short'];

// Risk Management Rules (defaults)
export const DEFAULT_RISK_RULES = {
  maxDailyLoss: 1,       // %
  riskPerTrade: 0.3,     // %
  minimumRR: 3,          // 1:3
  maxTradesPerDay: 3
};

// Pair display icons/colors
export const PAIR_COLORS = {
  'XAUUSD': '#F0A830',
  'GBPUSD': '#F96D6D',
  'EURUSD': '#4ECDC4',
  'US100': '#7C6CF0',
  'US30': '#5B9BD5',
  'SP500': '#E55555'
};
