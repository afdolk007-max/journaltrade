'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Download, Edit2, Trash2 } from 'lucide-react';
import { getTrades, deleteTrade, exportTradesJSON, exportTradesCSV } from '@/lib/trades';
import { getAllSettings } from '@/lib/settings';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { DirectionBadge, StatusBadge, MistakeBadge } from '@/components/Badge';
import FilterBar from '@/components/FilterBar';
import Pagination from '@/components/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import './history.css';

const PER_PAGE = 10;

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ account: 'All', pair: 'All', status: 'All' });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [sortField, setSortField] = useState('date_open');
  const [sortDir, setSortDir] = useState('desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [settingsData, tradesData] = await Promise.all([
      getAllSettings(),
      getTrades({ ...filters, search })
    ]);
    setSettings(settingsData);
    setTrades(tradesData.data || []);
    setLoading(false);
  }, [filters, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort trades
  const sorted = [...trades].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'date_open' || sortField === 'date_close') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTrade(deleteId);
    setDeleteId(null);
    loadData();
  };

  const handleExport = async (format) => {
    const content = format === 'json' ? await exportTradesJSON() : await exportTradesCSV();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dexornit-trades.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Trade History</h1>
        <div className="history-actions">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search pair..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="search-input"
            />
          </div>
          <div className="export-dropdown">
            <button className="btn btn-outline" onClick={() => handleExport('csv')}>
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={f => { setFilters(f); setCurrentPage(1); }}
        options={{ accounts: settings?.accounts || [], pairs: settings?.pairs || [] }}
      />

      <div className="card history-table-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <p>No trades found</p>
            <Link href="/add-trade" className="btn btn-primary">Add Your First Trade</Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('pair')} className="sortable">
                    Pair <SortIcon field="pair" />
                  </th>
                  <th onClick={() => handleSort('date_open')} className="sortable">
                    Date <SortIcon field="date_open" />
                  </th>
                  <th className="hide-mobile">End Trade</th>
                  <th>Direction</th>
                  <th onClick={() => handleSort('risk')} className="sortable">
                    Risk ($) <SortIcon field="risk" />
                  </th>
                  <th onClick={() => handleSort('pnl')} className="sortable">
                    P/L ($) <SortIcon field="pnl" />
                  </th>
                  <th>Status</th>
                  <th className="hide-mobile">R:R</th>
                  <th className="hide-mobile">Mistake</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(t => (
                  <tr key={t.id} className="animate-fade-in">
                    <td className="font-semibold">{t.pair}</td>
                    <td className="text-sm text-muted">{formatDateTime(t.date_open)}</td>
                    <td className="text-sm text-muted hide-mobile">{formatDateTime(t.date_close)}</td>
                    <td><DirectionBadge direction={t.direction} /></td>
                    <td>{formatCurrency(t.risk)}</td>
                    <td className={Number(t.pnl) >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                      {Number(t.pnl) > 0 ? '+' : ''}{formatCurrency(t.pnl)}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="hide-mobile">{t.rr === -1 ? '-1' : `1:${t.rr}`}</td>
                    <td className="hide-mobile"><MistakeBadge mistake={t.mistake} /></td>
                    <td>
                      <div className="action-btns">
                        <Link href={`/edit-trade/${t.id}`} className="btn btn-ghost btn-sm" title="Edit">
                          <Edit2 size={15} />
                        </Link>
                        <button className="btn btn-ghost btn-sm" title="Delete"
                          onClick={() => setDeleteId(t.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
