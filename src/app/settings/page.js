'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Save, Download, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAllSettings, saveDropdownOptions, getRiskRules, saveRiskRules, saveAllSettings } from '@/lib/settings';
import { exportTradesJSON, exportTradesCSV, importTradesJSON } from '@/lib/trades';
import ConfirmDialog from '@/components/ConfirmDialog';
import './settings.css';

const DROPDOWN_CONFIGS = [
  { key: 'pairs', label: 'Trading Pairs', placeholder: 'e.g. XAUUSD' },
  { key: 'accounts', label: 'Accounts', placeholder: 'e.g. ForTraders' },
  { key: 'frameworks', label: 'Frameworks', placeholder: 'e.g. GXT' },
  { key: 'narratives', label: 'Narratives', placeholder: 'e.g. LIQ > IMB' },
  { key: 'key_levels', label: 'Key Level HTF', placeholder: 'e.g. PDH' },
  { key: 'entry_models', label: 'Entry Models', placeholder: 'e.g. CISD' },
  { key: 'confluences', label: 'Confluences (Multi-Select)', placeholder: 'e.g. SMT' },
  { key: 'mistakes', label: 'Mistakes', placeholder: 'e.g. Broke Rules' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [riskRules, setRiskRules] = useState(null);
  const [newItems, setNewItems] = useState({});
  const [saving, setSaving] = useState({});
  const [globalSaving, setGlobalSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  
  // PIN management
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStatus, setPinStatus] = useState('');

  const handleSavePin = async () => {
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinStatus('PIN harus tepat 6 digit angka!');
      return;
    }
    if (newPin !== confirmPin) {
      setPinStatus('Konfirmasi PIN tidak cocok!');
      return;
    }
    const { setStoredPin } = await import('@/lib/auth');
    const success = setStoredPin(newPin);
    if (success) {
      setPinStatus('PIN berhasil diperbarui!');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => setPinStatus(''), 3000);
    } else {
      setPinStatus('Gagal memperbarui PIN.');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await getAllSettings();
    setSettings({
      pairs: s.pairs,
      accounts: s.accounts,
      frameworks: s.frameworks,
      narratives: s.narratives,
      key_levels: s.keyLevels,
      entry_models: s.entryModels,
      confluences: s.confluences || ['PSP', 'SMT', 'SSMT'],
      mistakes: s.mistakes,
    });
    setRiskRules({
      maxDailyLoss: String(s.riskRules.maxDailyLoss ?? 2),
      riskPerTrade: String(s.riskRules.riskPerTrade ?? 0.5),
      minimumRR: String(s.riskRules.minimumRR ?? 2),
      maxTradesPerDay: String(s.riskRules.maxTradesPerDay ?? 3),
    });
  }

  const handleRiskChange = (field, rawValue) => {
    // Replace comma with dot automatically
    const cleanVal = rawValue.replace(',', '.');
    // Allow empty string, numbers, and single decimal dot
    if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
      setRiskRules(prev => ({ ...prev, [field]: cleanVal }));
    }
  };

  async function addItem(key) {
    const value = newItems[key]?.trim();
    if (!value || !settings[key]) return;
    if (settings[key].includes(value)) return;
    
    const updated = [...settings[key], value];
    setSaving(p => ({ ...p, [key]: true }));
    setSettings(p => ({ ...p, [key]: updated }));
    setNewItems(p => ({ ...p, [key]: '' }));

    await saveDropdownOptions(key, updated);
    setSaving(p => ({ ...p, [key]: false }));
    triggerSuccessBanner(`Opsi ${key} berhasil ditambahkan & disimpan!`);
  }

  async function removeItem(key, value) {
    const updated = settings[key].filter(v => v !== value);
    setSettings(p => ({ ...p, [key]: updated }));
    await saveDropdownOptions(key, updated);
    triggerSuccessBanner(`Opsi ${key} berhasil dihapus & disimpan!`);
  }

  async function handleSaveRiskRules() {
    setSaving(p => ({ ...p, risk: true }));
    const parsedRiskRules = {
      maxDailyLoss: Number(riskRules.maxDailyLoss) || 0,
      riskPerTrade: Number(riskRules.riskPerTrade) || 0,
      minimumRR: Number(riskRules.minimumRR) || 0,
      maxTradesPerDay: Number(riskRules.maxTradesPerDay) || 0,
    };
    await saveRiskRules(parsedRiskRules);
    setSaving(p => ({ ...p, risk: false }));
    triggerSuccessBanner('Risk Management Rules berhasil disimpan!');
  }

  async function handleSaveAll() {
    setGlobalSaving(true);
    try {
      const parsedRiskRules = {
        maxDailyLoss: Number(riskRules.maxDailyLoss) || 0,
        riskPerTrade: Number(riskRules.riskPerTrade) || 0,
        minimumRR: Number(riskRules.minimumRR) || 0,
        maxTradesPerDay: Number(riskRules.maxTradesPerDay) || 0,
      };
      await saveAllSettings(settings, parsedRiskRules);
      triggerSuccessBanner('Semua Pengaturan (Dropdowns & Risk Rules) berhasil disimpan ke Database!');
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalSaving(false);
    }
  }

  function triggerSuccessBanner(msg) {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3500);
  }

  async function handleExport(format) {
    const content = format === 'json' ? await exportTradesJSON() : await exportTradesCSV();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dexornit-trades.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const { count, error } = await importTradesJSON(text);
    if (error) {
      setImportStatus(`Error: ${error}`);
    } else {
      setImportStatus(`Successfully imported ${count} trades!`);
    }
    setTimeout(() => setImportStatus(''), 3000);
  }

  function handleClearAll() {
    localStorage.removeItem('dexornit_trades');
    localStorage.removeItem('dexornit_settings');
    setShowClearConfirm(false);
    window.location.reload();
  }

  if (!settings || !riskRules) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="flex items-center justify-between flex-wrap gap-12 mb-20">
        <div>
          <h1>Settings & Preferences</h1>
          <p className="text-muted">Kelola opsi tag dropdown, risk rules, dan keamanan jurnal Anda</p>
        </div>

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSaveAll}
          disabled={globalSaving}
        >
          <Save size={16} />
          <span>{globalSaving ? 'Menyimpan ke Database...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Floating/Top Success Toast */}
      {saveSuccessMsg && (
        <div className="settings-success-toast animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Risk Management Rules */}
      <div className="card settings-section mt-16">
        <div className="flex items-center justify-between mb-16">
          <h3 className="settings-title">Risk Management Rules</h3>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={handleSaveRiskRules}
            disabled={saving.risk}
          >
            <Save size={14} /> {saving.risk ? 'Saving...' : 'Save Rules'}
          </button>
        </div>

        <div className="risk-grid">
          <div className="form-group">
            <label className="form-label">Max Daily Loss (%)</label>
            <input 
              type="text" 
              inputMode="decimal" 
              className="form-input"
              placeholder="e.g. 2"
              value={riskRules.maxDailyLoss ?? ''}
              onChange={e => handleRiskChange('maxDailyLoss', e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Risk per Trade (%)</label>
            <input 
              type="text" 
              inputMode="decimal" 
              className="form-input"
              placeholder="e.g. 0.5"
              value={riskRules.riskPerTrade ?? ''}
              onChange={e => handleRiskChange('riskPerTrade', e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Minimum R:R</label>
            <input 
              type="text" 
              inputMode="decimal" 
              className="form-input"
              placeholder="e.g. 2"
              value={riskRules.minimumRR ?? ''}
              onChange={e => handleRiskChange('minimumRR', e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Trades per Day</label>
            <input 
              type="text" 
              inputMode="numeric" 
              className="form-input"
              placeholder="e.g. 3"
              value={riskRules.maxTradesPerDay ?? ''}
              onChange={e => handleRiskChange('maxTradesPerDay', e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown Options */}
      <div className="settings-section mt-24">
        <div className="flex items-center justify-between mb-16">
          <div>
            <h3 className="settings-title">Dropdown Tag Options</h3>
            <p className="text-muted text-sm">Tambah atau hapus pilihan tag untuk form jurnal</p>
          </div>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handleSaveAll}
            disabled={globalSaving}
          >
            <Save size={14} /> {globalSaving ? 'Saving...' : 'Save All Tags'}
          </button>
        </div>

        <div className="dropdown-grid">
          {DROPDOWN_CONFIGS.map(({ key, label, placeholder }) => (
            <div key={key} className="card dropdown-card">
              <div className="flex items-center justify-between mb-8">
                <h4 className="dropdown-label">{label}</h4>
                {saving[key] && <span className="text-xs text-muted">Saving...</span>}
              </div>
              <div className="dropdown-items">
                {(settings[key] || []).map(item => (
                  <div key={item} className="dropdown-item">
                    <span>{item}</span>
                    <button 
                      type="button" 
                      className="remove-btn" 
                      onClick={() => removeItem(key, item)}
                      title={`Remove ${item}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="dropdown-add">
                <input
                  type="text"
                  className="form-input"
                  placeholder={placeholder}
                  value={newItems[key] || ''}
                  onChange={e => setNewItems(p => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem(key)}
                />
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  onClick={() => addItem(key)}
                  disabled={saving[key]}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & PIN Lock Management */}
      <div className="card settings-section mt-24">
        <h3 className="settings-title">Security & PIN Lock</h3>
        <p className="text-muted text-sm mb-16">
          Ubah 6-digit PIN keamanan untuk mengunci dan membuka jurnal trading pribadi Anda.
        </p>

        <div className="risk-grid" style={{ maxWidth: 460 }}>
          <div className="form-group">
            <label className="form-label">New 6-Digit PIN</label>
            <input 
              type="password" 
              maxLength={6} 
              className="form-input font-mono"
              placeholder="••••••"
              value={newPin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setNewPin(val);
                setPinStatus('');
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm PIN</label>
            <input 
              type="password" 
              maxLength={6} 
              className="form-input font-mono"
              placeholder="••••••"
              value={confirmPin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setConfirmPin(val);
                setPinStatus('');
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-12 mt-16">
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handleSavePin}
          >
            <Save size={14} /> Update PIN
          </button>
          {pinStatus && (
            <span className={`text-sm ${pinStatus.includes('berhasil') ? 'text-success font-semibold' : 'text-danger font-semibold'}`}>
              {pinStatus}
            </span>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card settings-section mt-24 mb-24">
        <h3 className="settings-title">Data Management</h3>
        <div className="data-actions">
          <button className="btn btn-outline" onClick={() => handleExport('json')}>
            <Download size={16} /> Export JSON
          </button>
          <button className="btn btn-outline" onClick={() => handleExport('csv')}>
            <Download size={16} /> Export CSV
          </button>
          <label className="btn btn-outline import-btn">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json" hidden onChange={handleImport} />
          </label>
          <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
        {importStatus && (
          <p className={`import-status ${importStatus.startsWith('Error') ? 'error' : 'success'}`}>
            {importStatus}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Data"
        message="This will permanently delete all your trades and settings. This action cannot be undone!"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
