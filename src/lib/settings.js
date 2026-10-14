import { supabase, isSupabaseConfigured } from './supabase';
import { 
  DEFAULT_PAIRS, DEFAULT_ACCOUNTS, DEFAULT_FRAMEWORKS,
  DEFAULT_NARRATIVES, DEFAULT_KEY_LEVELS, DEFAULT_ENTRY_MODELS,
  DEFAULT_CONFLUENCES, DEFAULT_MISTAKES, DEFAULT_RISK_RULES
} from './constants';

// Local storage helpers
function getLocalSettings() {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem('dexornit_settings');
  if (!data) return {};
  // H-02: Guard against corrupted localStorage data
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('[getLocalSettings] Corrupted localStorage, resetting:', e);
    localStorage.removeItem('dexornit_settings');
    return {};
  }
}

function setLocalSettings(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dexornit_settings', JSON.stringify(settings));
}

/**
 * Get dropdown options for a given type
 */
export async function getDropdownOptions(type) {
  const defaults = {
    pairs: DEFAULT_PAIRS,
    accounts: DEFAULT_ACCOUNTS,
    frameworks: DEFAULT_FRAMEWORKS,
    narratives: DEFAULT_NARRATIVES,
    key_levels: DEFAULT_KEY_LEVELS,
    entry_models: DEFAULT_ENTRY_MODELS,
    confluences: DEFAULT_CONFLUENCES,
    mistakes: DEFAULT_MISTAKES,
  };

  const localSettings = getLocalSettings();

  if (!isSupabaseConfigured()) {
    return localSettings[type] || defaults[type] || [];
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', type)
      .maybeSingle();

    if (error || !data || !data.value) {
      return localSettings[type] || defaults[type] || [];
    }

    // Keep local cache synced
    localSettings[type] = data.value;
    setLocalSettings(localSettings);
    return data.value;
  } catch (err) {
    return localSettings[type] || defaults[type] || [];
  }
}

/**
 * Save dropdown options for a given type
 */
export async function saveDropdownOptions(type, options) {
  // Always update local cache immediately
  const localSettings = getLocalSettings();
  localSettings[type] = options;
  setLocalSettings(localSettings);

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('settings')
      .upsert(
        { 
          id: `setting-${type}`, 
          key: type, 
          value: options,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );
    // M-04: Return error so caller can show it to user
    if (error) console.error(`[saveDropdownOptions] Supabase error for key=${type}:`, error);
    return { error: error || null };
  } catch (err) {
    console.error('Error saving settings to Supabase:', err);
    return { error: err };
  }
}

/**
 * Get risk management rules
 */
export async function getRiskRules() {
  const localSettings = getLocalSettings();

  if (!isSupabaseConfigured()) {
    return localSettings.risk_rules || DEFAULT_RISK_RULES;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'risk_rules')
      .maybeSingle();

    if (error || !data || !data.value) {
      return localSettings.risk_rules || DEFAULT_RISK_RULES;
    }

    localSettings.risk_rules = data.value;
    setLocalSettings(localSettings);
    return data.value;
  } catch (err) {
    return localSettings.risk_rules || DEFAULT_RISK_RULES;
  }
}

/**
 * Save risk management rules
 */
export async function saveRiskRules(rules) {
  const localSettings = getLocalSettings();
  localSettings.risk_rules = rules;
  setLocalSettings(localSettings);

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('settings')
      .upsert(
        { 
          id: 'setting-risk-rules', 
          key: 'risk_rules', 
          value: rules,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );
    return { error };
  } catch (err) {
    console.error('Error saving risk rules to Supabase:', err);
    return { error: err };
  }
}

/**
 * Save all settings at once (Bulk save)
 */
export async function saveAllSettings(settingsState, riskRulesState) {
  const promises = [];

  if (settingsState) {
    Object.keys(settingsState).forEach(key => {
      promises.push(saveDropdownOptions(key, settingsState[key]));
    });
  }

  if (riskRulesState) {
    promises.push(saveRiskRules(riskRulesState));
  }

  await Promise.all(promises);
  return { success: true };
}

/**
 * Get all settings at once
 */
export async function getAllSettings() {
  const [pairs, accounts, frameworks, narratives, keyLevels, entryModels, confluences, mistakes, riskRules] = 
    await Promise.all([
      getDropdownOptions('pairs'),
      getDropdownOptions('accounts'),
      getDropdownOptions('frameworks'),
      getDropdownOptions('narratives'),
      getDropdownOptions('key_levels'),
      getDropdownOptions('entry_models'),
      getDropdownOptions('confluences'),
      getDropdownOptions('mistakes'),
      getRiskRules(),
    ]);

  return { pairs, accounts, frameworks, narratives, keyLevels, entryModels, confluences, mistakes, riskRules };
}
