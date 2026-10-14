'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Trophy, Target, Calendar, Award, Wallet } from 'lucide-react';
import { getTrades } from '@/lib/trades';
import { getDashboardStats, getPNLTrend, getPNLByAccount, getWinLossRatio,
         getMonthlyReview, getYearlyReview, getPairStats, getAccountStats } from '@/lib/analytics';
import { formatCurrency, getMonthName, getShortMonthName } from '@/lib/utils';
import { PAIR_COLORS } from '@/lib/constants';
import StatCard from '@/components/StatCard';
import CustomSelect from '@/components/CustomSelect';
import './dashboard.css';

// Chart.js imports
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend);

/**
 * Reusable Circular Win Rate Gauge Ring
 */
function WinRateRing({ winrate, size = 42, strokeWidth = 3.8 }) {
  const wr = Math.min(100, Math.max(0, Number(winrate) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (wr / 100) * circumference;
  const color = wr >= 50 ? 'var(--teal)' : 'var(--primary)';

  return (
    <div className="winrate-ring-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="winrate-ring-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-alt)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="winrate-ring-text">{Math.round(wr)}%</span>
    </div>
  );
}

/**
 * Helper to format PnL with dynamic font sizing based on digit length
 */
function renderPnlBadge(amount) {
  const num = Number(amount || 0);
  const formatted = `${num >= 0 ? '+' : ''}${formatCurrency(num)}`;
  const len = formatted.length;
  
  let sizeClass = '';
  if (len > 12) sizeClass = 'pnl-compact-xs';
  else if (len > 10) sizeClass = 'pnl-compact-sm';

  return (
    <span className={`breakdown-pnl ${num >= 0 ? 'positive' : 'negative'} ${sizeClass}`}>
      {formatted}
    </span>
  );
}

export default function DashboardPage() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await getTrades();
    const allTrades = data || [];
    setTrades(allTrades);
    const s = await getDashboardStats(allTrades);
    setStats(s);

    // Auto set default year if trades exist
    if (allTrades.length > 0) {
      const latestYear = new Date(allTrades[0].date_open).getFullYear();
      setSelectedYear(latestYear);
      setMonthlyYear(latestYear);
    }
    setLoading(false);
  }

  // Available unique years from recorded trades
  const availableYears = useMemo(() => {
    const yearsSet = new Set(trades.map(t => new Date(t.date_open).getFullYear()));
    if (yearsSet.size === 0) yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [trades]);

  if (loading || !stats) {
    return (
      <div className="dashboard-page">
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const pnlTrend = getPNLTrend(trades, selectedYear);
  const pnlByAccount = getPNLByAccount(trades);
  const winLoss = getWinLossRatio(trades);
  const monthlyReview = getMonthlyReview(trades, monthlyYear);
  const yearlyReview = getYearlyReview(trades);
  const pairStats = getPairStats(trades);
  const accountStats = getAccountStats(trades);

  // Active months for selected monthly year
  const activeMonthly = monthlyReview.filter(m => m.total > 0);
  const accountColors = ['#F96D6D', '#4ECDC4', '#7C6CF0', '#F0A830', '#5B9BD5', '#E55555'];

  // Chart configurations
  const trendData = {
    labels: Array.from({ length: 12 }, (_, i) => getShortMonthName(i)),
    datasets: [{
      label: 'PNL ($)',
      data: pnlTrend,
      borderColor: '#F96D6D',
      backgroundColor: 'rgba(249, 109, 109, 0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#F96D6D',
      pointBorderWidth: 0,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` PNL: $${context.raw.toFixed(2)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
      y: { grid: { color: '#F0F0F0' }, ticks: { font: { size: 11, family: 'Inter' }, callback: v => `$${v}` } }
    }
  };

  const donutData = {
    labels: ['Win', 'Loss'],
    datasets: [{
      data: [winLoss.wins, winLoss.losses],
      backgroundColor: ['#4ECDC4', '#F96D6D'],
      borderWidth: 0,
      cutout: '74%',
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-bar">
        <div>
          <h1>Dashboard Analytics</h1>
          <p className="text-muted">Ringkasan performa trading dan statistik akun Anda</p>
        </div>
      </div>

      {/* 4 KPI Top Stat Cards */}
      <div className="grid grid-4 grid-2-mobile gap-16 mt-20">
        <StatCard
          label="Total Trades" value={stats.totalTrades}
          icon={<BarChart3 size={18} />} accent="primary"
          className="stagger-1"
        />
        <StatCard
          label="Win Rate" value={`${stats.winRate}%`}
          icon={<Target size={18} />} accent="teal"
          className="stagger-2"
        />
        <StatCard
          label="Total PNL" value={formatCurrency(stats.totalPNL)}
          icon={<TrendingUp size={18} />} accent="purple"
          className="stagger-3"
          mini={stats.totalPNL >= 0 ? '↗ Profit' : '↘ Loss'}
        />
        <StatCard
          label="Best Pair" value={stats.bestPair}
          icon={<Trophy size={18} />} accent="amber"
          className="stagger-4"
        />
      </div>

      {/* Top Level Charts (PNL Trend & Win/Loss) */}
      <div className="dashboard-charts-grid mt-20">
        <div className="card chart-card-main animate-fade-in stagger-3">
          <div className="card-header">
            <div className="breakdown-title-text">
              <span className="card-title">PNL Trend Curve</span>
              <p className="card-subtitle text-muted">Perkembangan laba/rugi bulanan</p>
            </div>
            <div className="breakdown-year-select-wrap">
              <CustomSelect
                options={availableYears.map(y => ({ value: y, label: String(y) }))}
                value={selectedYear}
                onChange={val => setSelectedYear(Number(val))}
                className="compact"
              />
            </div>
          </div>
          <div className="chart-container" style={{ height: 230 }}>
            <Line data={trendData} options={trendOptions} />
          </div>
        </div>

        <div className="card chart-card-donut animate-fade-in stagger-4">
          <div className="card-header">
            <span className="card-title">Win vs Loss</span>
          </div>
          <div className="donut-wrapper">
            <div className="donut-chart" style={{ height: 160, width: 160 }}>
              <Doughnut data={donutData} options={donutOptions} />
              <div className="donut-center">
                <span className="donut-pct">{stats.winRate}%</span>
                <span className="donut-label">Win Rate</span>
              </div>
            </div>
            <div className="donut-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#4ECDC4' }} />
                <span>Win: <strong>{winLoss.wins}</strong></span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#F96D6D' }} />
                <span>Loss: <strong>{winLoss.losses}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 UNIFIED BREAKDOWN CARDS (Monthly, Yearly, Pair, Account) */}
      <div className="breakdowns-heading mt-24">
        <h2>Performance Breakdowns</h2>
        <p className="text-muted text-sm">Analisis terpadu berdasarkan dimensi waktu, pair, dan akun</p>
      </div>

      <div className="grid grid-2 gap-16 mt-16">
        
        {/* 1. Monthly Performance */}
        <div className="card breakdown-card animate-fade-in stagger-3">
          <div className="breakdown-card-header">
            <div className="breakdown-header-title-wrap">
              <div className="breakdown-icon-pill primary">
                <Calendar size={16} />
              </div>
              <div className="breakdown-title-text">
                <span className="card-title">Monthly Review</span>
                <p className="card-subtitle text-muted">Tahun {monthlyYear}</p>
              </div>
            </div>
            <div className="breakdown-year-select-wrap">
              <CustomSelect
                options={availableYears.map(y => ({ value: y, label: String(y) }))}
                value={monthlyYear}
                onChange={val => setMonthlyYear(Number(val))}
                className="compact"
              />
            </div>
          </div>

          <div className="breakdown-list">
            {activeMonthly.length > 0 ? activeMonthly.map(m => (
              <div key={m.month} className="breakdown-item">
                <div className="breakdown-entity">
                  <span className="breakdown-badge">{getMonthName(m.month)}</span>
                  <div className="breakdown-counts">
                    <span className="count-pill total">{m.total} trades</span>
                    <span className="count-pill win">{m.wins} W</span>
                    <span className="count-pill loss">{m.total - m.wins} L</span>
                  </div>
                </div>

                <div className="breakdown-gauge-group">
                  <WinRateRing winrate={m.winrate} />
                </div>

                {renderPnlBadge(m.pnl)}
              </div>
            )) : (
              <div className="breakdown-empty text-muted">
                Belum ada trade yang tercatat di tahun {monthlyYear}
              </div>
            )}
          </div>
        </div>

        {/* 2. Yearly Performance */}
        <div className="card breakdown-card animate-fade-in stagger-4">
          <div className="breakdown-card-header">
            <div className="breakdown-header-title-wrap">
              <div className="breakdown-icon-pill teal">
                <Award size={16} />
              </div>
              <div className="breakdown-title-text">
                <span className="card-title">Yearly Overview</span>
                <p className="card-subtitle text-muted">Akumulasi performa per tahun</p>
              </div>
            </div>
          </div>

          <div className="breakdown-list">
            {yearlyReview.length > 0 ? yearlyReview.map(y => (
              <div key={y.year} className="breakdown-item">
                <div className="breakdown-entity">
                  <span className="breakdown-badge highlight">{y.year}</span>
                  <div className="breakdown-counts">
                    <span className="count-pill total">{y.total} trades</span>
                    <span className="count-pill win">{y.wins} W</span>
                    <span className="count-pill loss">{y.total - y.wins} L</span>
                  </div>
                </div>

                <div className="breakdown-gauge-group">
                  <WinRateRing winrate={y.winrate} />
                </div>

                {renderPnlBadge(y.pnl)}
              </div>
            )) : (
              <div className="breakdown-empty text-muted">Belum ada trade tercatat</div>
            )}
          </div>
        </div>

        {/* 3. Pair Performance */}
        <div className="card breakdown-card animate-fade-in stagger-5">
          <div className="breakdown-card-header">
            <div className="breakdown-header-title-wrap">
              <div className="breakdown-icon-pill purple">
                <Target size={16} />
              </div>
              <div className="breakdown-title-text">
                <span className="card-title">Pair Performance</span>
                <p className="card-subtitle text-muted">Statistik per instrumen pair</p>
              </div>
            </div>
          </div>

          <div className="breakdown-list">
            {pairStats.length > 0 ? pairStats.map(p => (
              <div key={p.pair} className="breakdown-item">
                <div className="breakdown-entity">
                  <div className="breakdown-entity-title">
                    <span 
                      className="pair-color-dot" 
                      style={{ background: PAIR_COLORS[p.pair] || '#7C6CF0' }} 
                    />
                    <span className="breakdown-badge">{p.pair}</span>
                  </div>
                  <div className="breakdown-counts">
                    <span className="count-pill total">{p.total} trades</span>
                    <span className="count-pill win">{p.wins} W</span>
                    <span className="count-pill loss">{p.total - p.wins} L</span>
                  </div>
                </div>

                <div className="breakdown-gauge-group">
                  <WinRateRing winrate={p.winrate} />
                </div>

                {renderPnlBadge(p.pnl)}
              </div>
            )) : (
              <div className="breakdown-empty text-muted">Belum ada trade tercatat</div>
            )}
          </div>
        </div>

        {/* 4. Account Performance */}
        <div className="card breakdown-card animate-fade-in stagger-6">
          <div className="breakdown-card-header">
            <div className="breakdown-header-title-wrap">
              <div className="breakdown-icon-pill amber">
                <Wallet size={16} />
              </div>
              <div className="breakdown-title-text">
                <span className="card-title">Account Breakdown</span>
                <p className="card-subtitle text-muted">Hasil trading per akun & prop firm</p>
              </div>
            </div>
          </div>

          <div className="breakdown-list">
            {accountStats.length > 0 ? accountStats.map((a, i) => (
              <div key={a.account} className="breakdown-item">
                <div className="breakdown-entity">
                  <div className="breakdown-entity-title">
                    <span 
                      className="account-accent-bar" 
                      style={{ background: accountColors[i % accountColors.length] }} 
                    />
                    <span className="breakdown-badge">{a.account}</span>
                  </div>
                  <div className="breakdown-counts">
                    <span className="count-pill total">{a.total} trades</span>
                    <span className="count-pill win">{a.wins} W</span>
                    <span className="count-pill loss">{a.total - a.wins} L</span>
                  </div>
                </div>

                <div className="breakdown-gauge-group">
                  <WinRateRing winrate={a.winrate} />
                </div>

                {renderPnlBadge(a.pnl)}
              </div>
            )) : (
              <div className="breakdown-empty text-muted">Belum ada akun tercatat</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
