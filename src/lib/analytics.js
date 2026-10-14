import { getTrades } from './trades';

/**
 * Get all dashboard statistics
 */
export async function getDashboardStats(trades = null) {
  if (!trades) {
    const result = await getTrades();
    trades = result.data || [];
  }

  const totalTrades = trades.length;
  const wins = trades.filter(t => t.status === 'Win');
  const losses = trades.filter(t => t.status === 'Loss');
  const breakevens = trades.filter(t => t.status === 'Breakeven');
  const winRate = totalTrades > 0 ? ((wins.length / totalTrades) * 100).toFixed(2) : '0.00';
  const totalPNL = trades.reduce((sum, t) => sum + (isNaN(Number(t.pnl)) ? 0 : Number(t.pnl)), 0);
  
  // Best pair by winrate (minimum 1 trade)
  const pairGroups = {};
  trades.forEach(t => {
    if (!t.pair) return;
    if (!pairGroups[t.pair]) pairGroups[t.pair] = { wins: 0, total: 0, pnl: 0 };
    pairGroups[t.pair].total++;
    pairGroups[t.pair].pnl += (isNaN(Number(t.pnl)) ? 0 : Number(t.pnl));
    if (t.status === 'Win') pairGroups[t.pair].wins++;
  });
  
  let bestPair = 'N/A';
  let bestWinrate = -1;
  Object.entries(pairGroups).forEach(([pair, stats]) => {
    const wr = stats.total > 0 ? stats.wins / stats.total : 0;
    if (wr > bestWinrate) {
      bestWinrate = wr;
      bestPair = pair;
    }
  });

  return { totalTrades, winRate, totalPNL, bestPair, wins: wins.length, losses: losses.length, breakevens: breakevens.length };
}

/**
 * Get PNL trend data (monthly PNL for chart)
 */
export function getPNLTrend(trades, year) {
  const monthly = Array(12).fill(0);
  trades.forEach(t => {
    const d = new Date(t.date_open);
    if (!isNaN(d.getTime()) && d.getFullYear() === year) {
      monthly[d.getMonth()] += (isNaN(Number(t.pnl)) ? 0 : Number(t.pnl));
    }
  });
  return monthly;
}

/**
 * Get PNL per account
 */
export function getPNLByAccount(trades) {
  const accounts = {};
  trades.forEach(t => {
    const acc = t.account || 'Unknown';
    if (!accounts[acc]) accounts[acc] = 0;
    accounts[acc] += (isNaN(Number(t.pnl)) ? 0 : Number(t.pnl));
  });
  return accounts;
}

/**
 * Get win/loss ratio
 */
export function getWinLossRatio(trades) {
  const wins = trades.filter(t => t.status === 'Win').length;
  const losses = trades.filter(t => t.status === 'Loss').length;
  const breakevens = trades.filter(t => t.status === 'Breakeven').length;
  return { wins, losses, breakevens };
}

/**
 * Get monthly review for a given year
 */
export function getMonthlyReview(trades, year) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const monthTrades = trades.filter(t => {
      const d = new Date(t.date_open);
      return d.getFullYear() === year && d.getMonth() === m;
    });
    const wins = monthTrades.filter(t => t.status === 'Win').length;
    const total = monthTrades.length;
    const winrate = total > 0 ? ((wins / total) * 100).toFixed(2) : '0.00';
    const pnl = monthTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    months.push({ month: m, total, wins, winrate, pnl });
  }
  return months;
}

/**
 * Get yearly review
 */
export function getYearlyReview(trades) {
  const years = {};
  trades.forEach(t => {
    const year = new Date(t.date_open).getFullYear();
    if (!years[year]) years[year] = { total: 0, wins: 0, pnl: 0 };
    years[year].total++;
    years[year].pnl += Number(t.pnl || 0);
    if (t.status === 'Win') years[year].wins++;
  });

  return Object.entries(years).map(([year, stats]) => ({
    year: Number(year),
    total: stats.total,
    wins: stats.wins,
    winrate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(2) : '0.00',
    pnl: stats.pnl
  })).sort((a, b) => b.year - a.year);
}

/**
 * Get pair statistics
 */
export function getPairStats(trades) {
  const pairs = {};
  trades.forEach(t => {
    if (!pairs[t.pair]) pairs[t.pair] = { total: 0, wins: 0, pnl: 0 };
    pairs[t.pair].total++;
    pairs[t.pair].pnl += Number(t.pnl || 0);
    if (t.status === 'Win') pairs[t.pair].wins++;
  });

  return Object.entries(pairs).map(([pair, stats]) => ({
    pair,
    total: stats.total,
    wins: stats.wins,
    winrate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(2) : '0.00',
    pnl: stats.pnl
  })).sort((a, b) => b.total - a.total);
}

/**
 * Get account statistics
 */
export function getAccountStats(trades) {
  const accounts = {};
  trades.forEach(t => {
    if (!accounts[t.account]) accounts[t.account] = { total: 0, wins: 0, pnl: 0 };
    accounts[t.account].total++;
    accounts[t.account].pnl += Number(t.pnl || 0);
    if (t.status === 'Win') accounts[t.account].wins++;
  });

  return Object.entries(accounts).map(([account, stats]) => ({
    account,
    total: stats.total,
    wins: stats.wins,
    winrate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(2) : '0.00',
    pnl: stats.pnl
  })).sort((a, b) => b.pnl - a.pnl);
}
