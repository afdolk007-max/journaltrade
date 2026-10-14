'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getTradesByMonth, deleteTrade } from '@/lib/trades';
import { getMonthName, formatCurrency, formatTime } from '@/lib/utils';
import TradeOverviewModal from '@/components/TradeOverviewModal';
import './home.css';

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [fetchError, setFetchError] = useState('');

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    const { data, error } = await getTradesByMonth(year, month);
    if (error) {
      console.error('Error fetching calendar trades:', error);
      setFetchError('Gagal memuat data trade dari database. Menampilkan data lokal.');
    }
    setTrades(data || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Calendar helpers
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (day) => 
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  // Group trades by day
  const tradesByDay = {};
  trades.forEach(t => {
    const day = new Date(t.date_open).getDate();
    if (!tradesByDay[day]) tradesByDay[day] = [];
    tradesByDay[day].push(t);
  });

  // Calculate monthly stats for calendar banner
  const totalMonthTrades = trades.length;
  const monthWins = trades.filter(t => t.status === 'Win').length;
  const monthPnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const monthWinrate = totalMonthTrades > 0 ? Math.round((monthWins / totalMonthTrades) * 100) : 0;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const handleDeleteTrade = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus trade ini?')) {
      const { error } = await deleteTrade(id);
      if (error) {
        alert(`Gagal menghapus trade dari database: ${error.message || error}`);
        return;
      }
      setSelectedTrade(null);
      loadTrades();
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1>Trading Journal</h1>
          <p className="home-subtitle">Catat dan tinjau riwayat eksekusi trade harian Anda</p>
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          ⚠️ {fetchError}
        </div>
      )}

      {/* Monthly Summary Bar above calendar */}
      <div className="calendar-quick-summary card">
        <div className="summary-stat-item">
          <span className="summary-stat-label">Bulan Ini</span>
          <span className="summary-stat-value">{getMonthName(month)} {year}</span>
        </div>
        <div className="summary-stat-item">
          <span className="summary-stat-label">Total Trades</span>
          <span className="summary-stat-value">{totalMonthTrades} ({monthWins}W - {totalMonthTrades - monthWins}L)</span>
        </div>
        <div className="summary-stat-item">
          <span className="summary-stat-label">Win Rate</span>
          <span className="summary-stat-value text-success">{monthWinrate}%</span>
        </div>
        <div className="summary-stat-item">
          <span className="summary-stat-label">Net P&L</span>
          <span className={`summary-stat-value ${monthPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {monthPnl >= 0 ? '+' : ''}{formatCurrency(monthPnl)}
          </span>
        </div>
      </div>

      <div className="calendar-container card mt-16">
        <div className="calendar-header">
          <div className="calendar-nav">
            <button className="btn btn-ghost" onClick={prevMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft size={20} />
            </button>
            <h2 className="calendar-title">{getMonthName(month)} {year}</h2>
            <button className="btn btn-ghost" onClick={nextMonth} aria-label="Bulan berikutnya">
              <ChevronRight size={20} />
            </button>
          </div>
          <button className="btn btn-outline btn-sm calendar-today-btn" onClick={goToday}>
            Hari ini
          </button>
        </div>

        <div className="calendar-grid">
          {dayNames.map(d => (
            <div key={d} className="calendar-day-name">{d}</div>
          ))}

          {cells.map((day, i) => (
            <div
              key={i}
              className={`calendar-cell ${day ? '' : 'empty'} ${day && isToday(day) ? 'today' : ''}`}
            >
              {day && (
                <>
                  <span className="calendar-date">{day}</span>
                  <div className="calendar-trades">
                    {(tradesByDay[day] || []).slice(0, 3).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTrade(t)}
                        className={`calendar-trade-card ${t.status === 'Win' ? 'win' : 'loss'}`}
                      >
                        <span className="trade-pair">{t.pair}</span>
                        <span className="trade-pnl">
                          {Number(t.pnl) > 0 ? '+' : ''}{formatCurrency(t.pnl).replace('US', '')}
                        </span>
                      </button>
                    ))}
                    {(tradesByDay[day] || []).length > 3 && (
                      <span className="calendar-more">
                        +{tradesByDay[day].length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {loading && (
          <div className="calendar-loading">
            <div className="loading-spinner" />
          </div>
        )}
      </div>

      {/* FAB Add Trade */}
      <Link href="/add-trade" className="fab" aria-label="Add Trade">
        <Plus size={24} />
      </Link>

      {/* Trade Overview Modal */}
      {selectedTrade && (
        <TradeOverviewModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onDelete={handleDeleteTrade}
        />
      )}
    </div>
  );
}
