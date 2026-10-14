import { supabase, isSupabaseConfigured } from './supabase';
import { generateId, calculateStatus, calculateDuration, isTradingViewUrl, getTradingViewWebUrl } from './utils';
import { SAMPLE_TRADES } from './dummyData';

// ==================== LOCAL STORAGE FALLBACK ====================
// When Supabase is not configured, use localStorage

function getLocalTrades() {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('dexornit_trades');
  if (!data) {
    localStorage.setItem('dexornit_trades', JSON.stringify(SAMPLE_TRADES));
    return SAMPLE_TRADES;
  }
  // C-04: Guard against corrupted localStorage data
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('[getLocalTrades] Corrupted localStorage, resetting:', e);
    localStorage.removeItem('dexornit_trades');
    return [];
  }
}

function setLocalTrades(trades) {
  localStorage.setItem('dexornit_trades', JSON.stringify(trades));
}

// ==================== TRADE CRUD ====================

export async function getTrades(filters = {}) {
  if (!isSupabaseConfigured()) {
    let trades = getLocalTrades();
    
    if (filters.account && filters.account !== 'All') {
      trades = trades.filter(t => t.account === filters.account);
    }
    if (filters.pair && filters.pair !== 'All') {
      trades = trades.filter(t => t.pair === filters.pair);
    }
    if (filters.status && filters.status !== 'All') {
      trades = trades.filter(t => t.status === filters.status);
    }
    if (filters.dateFrom) {
      trades = trades.filter(t => new Date(t.date_open) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      trades = trades.filter(t => new Date(t.date_open) <= new Date(filters.dateTo));
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      trades = trades.filter(t => t.pair.toLowerCase().includes(s));
    }
    
    trades.sort((a, b) => new Date(b.date_open) - new Date(a.date_open));
    return { data: trades, error: null };
  }

  let query = supabase.from('trades').select('*');

  if (filters.account && filters.account !== 'All') {
    query = query.eq('account', filters.account);
  }
  if (filters.pair && filters.pair !== 'All') {
    query = query.eq('pair', filters.pair);
  }
  if (filters.status && filters.status !== 'All') {
    query = query.eq('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('date_open', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('date_open', filters.dateTo);
  }
  if (filters.search) {
    query = query.ilike('pair', `%${filters.search}%`);
  }

  query = query.order('date_open', { ascending: false });

  const { data, error } = await query;
  return { data, error };
}

export async function getTradeById(id) {
  if (!isSupabaseConfigured()) {
    const trades = getLocalTrades();
    const trade = trades.find(t => t.id === id);
    return { data: trade || null, error: trade ? null : 'Not found' };
  }

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

/**
 * Build a clean, strictly schema-compliant trade payload for Supabase and LocalStorage
 */
function buildTradePayload(rawTrade, existingId = null) {
  const pnl = isNaN(Number(rawTrade.pnl)) ? 0 : Number(rawTrade.pnl);
  const risk = isNaN(Number(rawTrade.risk)) ? 0 : Math.abs(Number(rawTrade.risk)); // M-06: guard NaN
  // M-01: use canonical calculateStatus from utils.js (handles Breakeven correctly)
  const status = calculateStatus(pnl) || 'Loss';
  const rr = risk === 0 ? 0 : (pnl > 0 ? parseFloat((Math.abs(pnl) / risk).toFixed(1)) : -1);

  // Filter screenshots to clean array of valid objects
  const screenshots = (rawTrade.screenshots || [])
    .filter(s => s && s.url?.trim())
    .map(s => {
      const isTv = s.type === 'link' && isTradingViewUrl(s.url);
      return {
        id: s.id || generateId(),
        timeframe: s.timeframe || '',
        type: s.type || 'link',
        url: isTv ? getTradingViewWebUrl(s.url) : (s.url || ''),
      };
    });

  const primaryScreenshot = screenshots[0];

  // Clean confluences array
  const confluences = Array.isArray(rawTrade.confluences) 
    ? rawTrade.confluences 
    : (rawTrade.confluence ? [rawTrade.confluence] : []);

  // Return strictly typed payload matching PostgreSQL trades schema
  return {
    id: existingId || rawTrade.id || generateId(),
    pair: String(rawTrade.pair || '').trim(),
    direction: rawTrade.direction === 'Short' ? 'Short' : 'Long',
    account: String(rawTrade.account || '').trim(),
    date_open: rawTrade.date_open ? new Date(rawTrade.date_open).toISOString() : new Date().toISOString(),
    date_close: rawTrade.date_close ? new Date(rawTrade.date_close).toISOString() : new Date().toISOString(),
    risk: risk,
    pnl: pnl,
    status: status,
    rr: rr,
    trade_duration: rawTrade.trade_duration || calculateDuration(rawTrade.date_open, rawTrade.date_close) || '',
    framework: rawTrade.framework || '',
    market_profile: rawTrade.market_profile || '',
    narrative: rawTrade.narrative || '',
    key_level_htf: rawTrade.key_level_htf || '',
    entry_model: rawTrade.entry_model || '',
    confluences: confluences,
    mistake: rawTrade.mistake || 'None',
    screenshot_type: primaryScreenshot?.type || 'link',
    screenshot_url: primaryScreenshot?.url || '',
    screenshots: screenshots,
    emotion_before: rawTrade.emotion_before || '',
    emotion_during: rawTrade.emotion_during || '',
    emotion_after: rawTrade.emotion_after || '',
    created_at: rawTrade.created_at || new Date().toISOString(),
  };
}

export async function createTrade(tradeData) {
  const trade = buildTradePayload(tradeData);

  if (!isSupabaseConfigured()) {
    const localTrades = getLocalTrades();
    localTrades.unshift(trade);
    setLocalTrades(localTrades);
    return { data: trade, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trades')
      .insert([trade])
      .select()
      .single();

    if (error) {
      console.error('Supabase createTrade error:', error);
      return { data: null, error };
    }

    // Keep local cache synced on success
    const localTrades = getLocalTrades();
    localTrades.unshift(data || trade);
    setLocalTrades(localTrades);

    return { data: data || trade, error: null };
  } catch (err) {
    console.error('Supabase insert exception:', err);
    return { data: null, error: err };
  }
}

export async function updateTrade(id, tradeData) {
  const updates = buildTradePayload(tradeData, id);

  if (!isSupabaseConfigured()) {
    const localTrades = getLocalTrades();
    const index = localTrades.findIndex(t => t.id === id);
    if (index >= 0) {
      localTrades[index] = { ...localTrades[index], ...updates };
      setLocalTrades(localTrades);
    }
    return { data: updates, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateTrade error:', error);
      return { data: null, error };
    }

    // Update local cache on success
    const localTrades = getLocalTrades();
    const index = localTrades.findIndex(t => t.id === id);
    if (index >= 0) {
      localTrades[index] = { ...localTrades[index], ...updates };
      setLocalTrades(localTrades);
    }

    return { data: data || updates, error: null };
  } catch (err) {
    console.error('Supabase update exception:', err);
    return { data: null, error: err };
  }
}

export async function deleteTrade(id) {
  if (!isSupabaseConfigured()) {
    const trades = getLocalTrades();
    const filtered = trades.filter(t => t.id !== id);
    setLocalTrades(filtered);
    return { error: null };
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id);
  return { error };
}

export async function getTradesByMonth(year, month) {
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  if (!isSupabaseConfigured()) {
    const trades = getLocalTrades();
    const filtered = trades.filter(t => {
      const d = new Date(t.date_open);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });
    filtered.sort((a, b) => new Date(a.date_open) - new Date(b.date_open));
    return { data: filtered, error: null };
  }

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .gte('date_open', startDate)
    .lte('date_open', endDate)
    .order('date_open', { ascending: true });
  return { data, error };
}

// ==================== SCREENSHOT UPLOAD ====================

export async function uploadScreenshot(file, tradeId = null) {
  if (!file) return { url: null, error: 'No file provided' };

  if (!isSupabaseConfigured()) {
    // Store as base64 in localStorage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result, error: null });
      };
      reader.readAsDataURL(file);
    });
  }

  const fileExt = file.name ? file.name.split('.').pop() : 'png';
  const fileId = generateId();
  const folder = tradeId || 'uploads';
  const filePath = `${folder}/${fileId}.${fileExt}`;
  
  try {
    const { error: uploadError } = await supabase.storage
      .from('trade-screenshots')
      .upload(filePath, file, { 
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/png'
      });

    if (uploadError) {
      console.warn('Supabase storage upload error, fallback to base64:', uploadError);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ url: reader.result, error: null });
        };
        reader.readAsDataURL(file);
      });
    }

    const { data } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(filePath);

    return { url: data?.publicUrl || '', error: null };
  } catch (err) {
    console.error('Storage upload exception:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result, error: null });
      };
      reader.readAsDataURL(file);
    });
  }
}

// ==================== EXPORT/IMPORT ====================

export async function exportTradesJSON() {
  const { data } = await getTrades();
  return JSON.stringify(data, null, 2);
}

export async function exportTradesCSV() {
  const { data } = await getTrades();
  if (!data || data.length === 0) return '';

  const headers = ['Pair', 'Direction', 'Account', 'Date Open', 'Date Close', 
    'Risk ($)', 'P/L ($)', 'Status', 'R:R', 'Framework', 'Market Profile',
    'Narrative', 'Key Level HTF', 'Entry Model', 'Mistake', 'Duration'];
  
  const rows = data.map(t => [
    t.pair, t.direction, t.account, t.date_open, t.date_close,
    t.risk, t.pnl, t.status, t.rr, t.framework || '', t.market_profile || '',
    t.narrative || '', t.key_level_htf || '', t.entry_model || '', t.mistake || '',
    t.trade_duration || ''
  ]);

  // M-02: Escape double-quotes inside values by doubling them (CSV standard)
  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
}

export async function importTradesJSON(jsonString) {
  try {
    const trades = JSON.parse(jsonString);
    if (!Array.isArray(trades)) throw new Error('Format tidak valid — file harus berisi array of trades');
    
    // C-05: Validate each record before inserting
    let imported = 0;
    let skipped = 0;
    for (const trade of trades) {
      // Minimum required fields
      if (!trade.pair || trade.pnl === undefined || trade.pnl === null || !trade.date_open || !trade.risk) {
        console.warn('[importTradesJSON] Skipping invalid trade record:', trade?.id || '(no id)');
        skipped++;
        continue;
      }
      const { error } = await createTrade(trade);
      if (error) {
        console.error('[importTradesJSON] Failed to insert trade:', trade?.id, error);
        skipped++;
      } else {
        imported++;
      }
    }
    return { count: imported, skipped, error: null };
  } catch (err) {
    return { count: 0, skipped: 0, error: err.message };
  }
}
