/**
 * Calculate trade status from P/L
 * Win: pnl > 0 | Breakeven: pnl === 0 | Loss: pnl < 0
 */
export function calculateStatus(pnl) {
  if (pnl === null || pnl === undefined || pnl === '') return '';
  const num = Number(pnl);
  if (isNaN(num)) return '';
  if (num > 0) return 'Win';
  if (num < 0) return 'Loss';
  return 'Breakeven';
}

/**
 * Calculate Risk-to-Reward ratio
 * Win → abs(P/L) / Risk (e.g., "1:3.1")
 * Loss → -1
 */
export function calculateRR(risk, pnl) {
  const r = Number(risk);
  const p = Number(pnl);
  if (!r || r === 0) return 'N/A';
  if (p > 0) {
    const ratio = Math.abs(p) / r;
    return `1:${ratio.toFixed(1)}`;
  }
  return '-1';
}

/**
 * Calculate trade duration from open and close dates
 */
export function calculateDuration(dateOpen, dateClose) {
  if (!dateOpen || !dateClose) return '';
  const start = new Date(dateOpen);
  const end = new Date(dateClose);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '0m';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h ${minutes}m` : `${days}d ${minutes}m`;
  }
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format currency to US$ display
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 'US$0.00';
  const prefix = num < 0 ? '-' : '';
  return `${prefix}US$${Math.abs(num).toFixed(2)}`;
}

/**
 * Format date to readable string with strict 24-hour format (e.g. 14 Aug 2026 09:25 / 14 Aug 2026 23:45)
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

/**
 * Format time for calendar display (strict 24-hour e.g. 09:25, 23:45)
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Get month name in Indonesian
 */
export function getMonthName(monthIndex) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months[monthIndex];
}

/**
 * Get short month name
 */
export function getShortMonthName(monthIndex) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return months[monthIndex];
}

/**
 * Generate UUID
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

/**
 * Get datetime-local input value from Date
 */
export function toDateTimeLocal(date) {
  if (!date) date = new Date();
  if (typeof date === 'string') date = new Date(date);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Format number with sign
 */
export function formatPnl(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '$0.00';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}$${num.toFixed(2)}`;
}

/**
 * Extract TradingView snapshot ID from any TV snapshot URL format
 */
export function getTradingViewSnapshotId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Matches s3.tradingview.com/snapshots/{char}/{id}.png
  const s3Match = trimmed.match(/s3\.tradingview\.com\/snapshots\/[a-zA-Z0-9]\/([a-zA-Z0-9_-]+)/i);
  if (s3Match && s3Match[1]) {
    return s3Match[1].replace(/\.png$/i, '');
  }

  // Matches s3.tradingview.com/x/{id}
  const s3XMatch = trimmed.match(/s3\.tradingview\.com\/x\/([a-zA-Z0-9_-]+)/i);
  if (s3XMatch && s3XMatch[1]) {
    return s3XMatch[1].replace(/\.png$/i, '');
  }

  // Matches (www.)tradingview.com/x/{id}
  const tvMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?tradingview\.com\/x\/([a-zA-Z0-9_-]+)/i);
  if (tvMatch && tvMatch[1]) {
    return tvMatch[1].replace(/\.png$/i, '');
  }

  return null;
}

/**
 * Check if a URL is a TradingView snapshot link
 */
export function isTradingViewUrl(url) {
  return !!getTradingViewSnapshotId(url);
}

/**
 * Get clean TradingView webpage link to open in new tab (e.g. https://www.tradingview.com/x/SuSyFJXx/)
 */
export function getTradingViewWebUrl(url) {
  const snapshotId = getTradingViewSnapshotId(url);
  if (snapshotId) {
    return `https://www.tradingview.com/x/${snapshotId}/`;
  }
  return url;
}

/**
 * Normalize a TradingView link or general image URL so it can render directly in <img src="..." />
 * TradingView snapshots are hosted directly on S3: https://s3.tradingview.com/snapshots/{first_char_lowercase}/{snapshotId}.png
 */
export function normalizeChartUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already a base64 data URL
  if (trimmed.startsWith('data:image')) return trimmed;

  // TradingView snapshot link -> S3 direct image link
  const snapshotId = getTradingViewSnapshotId(trimmed);
  if (snapshotId) {
    const firstChar = snapshotId.charAt(0).toLowerCase();
    return `https://s3.tradingview.com/snapshots/${firstChar}/${snapshotId}.png`;
  }

  return trimmed;
}

