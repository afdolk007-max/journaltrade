'use client';

import CustomSelect from '@/components/CustomSelect';
import './FilterBar.css';

export default function FilterBar({ filters, onFilterChange, options = {} }) {
  const { accounts = [], pairs = [] } = options;

  return (
    <div className="filter-bar">
      <div className="filter-pill">
        <label className="filter-label">Account</label>
        <div style={{ minWidth: 140 }}>
          <CustomSelect
            options={['All', ...accounts]}
            value={filters.account || 'All'}
            onChange={val => onFilterChange({ ...filters, account: val })}
            className="compact"
          />
        </div>
      </div>

      <div className="filter-pill">
        <label className="filter-label">Pair</label>
        <div style={{ minWidth: 120 }}>
          <CustomSelect
            options={['All', ...pairs]}
            value={filters.pair || 'All'}
            onChange={val => onFilterChange({ ...filters, pair: val })}
            className="compact"
          />
        </div>
      </div>

      <div className="filter-pill">
        <label className="filter-label">Status</label>
        <div style={{ minWidth: 110 }}>
          <CustomSelect
            options={['All', 'Win', 'Loss']}
            value={filters.status || 'All'}
            onChange={val => onFilterChange({ ...filters, status: val })}
            className="compact"
          />
        </div>
      </div>

      {filters.account !== 'All' || filters.pair !== 'All' || filters.status !== 'All' ? (
        <button
          type="button"
          className="filter-clear"
          onClick={() => onFilterChange({ account: 'All', pair: 'All', status: 'All' })}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
