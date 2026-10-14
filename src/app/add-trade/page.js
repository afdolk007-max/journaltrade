'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Upload, Link2, Camera, Plus, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { createTrade, updateTrade, uploadScreenshot } from '@/lib/trades';
import { getAllSettings } from '@/lib/settings';
import { calculateStatus, calculateRR, calculateDuration, toDateTimeLocal, normalizeChartUrl, isTradingViewUrl, generateId } from '@/lib/utils';
import { StatusBadge } from '@/components/Badge';
import CustomSelect from '@/components/CustomSelect';
import './trade-form.css';

export default function AddTradePage() {
  return <TradeFormPage mode="add" />;
}

export function TradeFormPage({ mode = 'add', initialData = null }) {
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pair: '',
    direction: 'Long',
    account: '',
    date_open: toDateTimeLocal(new Date()),
    date_close: toDateTimeLocal(new Date()),
    risk: '',
    pnl: '',
    framework: '',
    market_profile: '',
    narrative: '',
    key_level_htf: '',
    entry_model: '',
    confluences: [],
    mistake: 'None',
    screenshots: [
      {
        id: generateId(),
        timeframe: 'HTF (Daily / H4)',
        type: 'link',
        url: ''
      }
    ],
    screenshot_type: 'link',
    screenshot_url: '',
    emotion_before: '',
    emotion_during: '',
    emotion_after: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (initialData) {
      let initialScreenshots = [];
      if (initialData.screenshots && Array.isArray(initialData.screenshots) && initialData.screenshots.length > 0) {
        initialScreenshots = initialData.screenshots;
      } else if (initialData.screenshot_url) {
        initialScreenshots = [
          {
            id: generateId(),
            timeframe: 'HTF (Daily / H4)',
            type: initialData.screenshot_type || 'link',
            url: initialData.screenshot_url
          }
        ];
      } else {
        initialScreenshots = [
          {
            id: generateId(),
            timeframe: 'HTF (Daily / H4)',
            type: 'link',
            url: ''
          }
        ];
      }

      const initialConfluences = initialData.confluences 
        ? (Array.isArray(initialData.confluences) ? initialData.confluences : [initialData.confluences])
        : (initialData.confluence ? [initialData.confluence] : []);

      setForm({
        ...initialData,
        date_open: toDateTimeLocal(initialData.date_open),
        date_close: toDateTimeLocal(initialData.date_close),
        screenshots: initialScreenshots,
        confluences: initialConfluences,
      });
    }
  }, [initialData]);

  async function loadSettings() {
    const s = await getAllSettings();
    setSettings(s);
    if (!initialData) {
      setForm(prev => ({
        ...prev,
        pair: s.pairs[0] || '',
        account: s.accounts[0] || '',
        framework: s.frameworks[0] || '',
        narrative: s.narratives[0] || '',
        key_level_htf: s.keyLevels[0] || '',
        entry_model: s.entryModels[0] || '',
      }));
    }
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Multi-Screenshot Handlers
  const addScreenshotItem = () => {
    const defaultTf = form.screenshots.length === 1 ? 'LTF Entry (M5 / M1)' : 
                      form.screenshots.length === 2 ? 'MTF (H1 / M15)' : 'Execution / Close';
    setForm(prev => ({
      ...prev,
      screenshots: [
        ...prev.screenshots,
        {
          id: generateId(),
          timeframe: defaultTf,
          type: 'link',
          url: ''
        }
      ]
    }));
  };

  const removeScreenshotItem = (id) => {
    setForm(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter(s => s.id !== id)
    }));
  };

  const updateScreenshotItem = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      screenshots: prev.screenshots.map(s => {
        if (s.id !== id) return s;
        return { ...s, [field]: value };
      })
    }));
  };

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    updateScreenshotItem(id, 'type', 'upload');

    // Immediately show preview via FileReader while uploading
    const reader = new FileReader();
    reader.onloadend = () => {
      updateScreenshotItem(id, 'url', reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage in background
    try {
      const { url } = await uploadScreenshot(file, initialData?.id || form.id);
      if (url) {
        updateScreenshotItem(id, 'url', url);
      }
    } catch (e) {
      console.warn('Upload to storage warning:', e);
    }
  };

  const status = calculateStatus(form.pnl);
  const rr = calculateRR(form.risk, form.pnl);
  const duration = calculateDuration(form.date_open, form.date_close);

  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Required fields validation
    if (!form.pair?.trim()) {
      setFormError('Silakan pilih Pair!');
      return;
    }
    if (!form.account?.trim()) {
      setFormError('Silakan pilih Akun!');
      return;
    }
    if (!form.date_open || !form.date_close) {
      setFormError('Silakan tentukan Waktu Open dan End Trade!');
      return;
    }
    if (form.risk === '' || isNaN(Number(form.risk)) || Number(form.risk) <= 0) {
      setFormError('Risk ($) wajib diisi dengan nominal angka lebih dari 0!');
      return;
    }
    if (form.pnl === '' || isNaN(Number(form.pnl))) {
      setFormError('Profit/Loss ($) wajib diisi (gunakan tanda minus - jika loss)!');
      return;
    }
    if (!form.framework?.trim() || form.framework === '— Select —') {
      setFormError('Silakan pilih Framework!');
      return;
    }
    if (!form.narrative?.trim() || form.narrative === '— Select —') {
      setFormError('Silakan pilih Narrative!');
      return;
    }
    if (!form.key_level_htf?.trim() || form.key_level_htf === '— Select —') {
      setFormError('Silakan pilih Key Level HTF!');
      return;
    }
    if (!form.entry_model?.trim() || form.entry_model === '— Select —') {
      setFormError('Silakan pilih Entry Model!');
      return;
    }
    if (!form.market_profile?.trim()) {
      setFormError('Market Profile (Catatan Analisa/Setup) wajib diisi!');
      return;
    }

    setSaving(true);

    try {
      const validScreenshots = (form.screenshots || []).filter(s => s.url?.trim());
      const primaryScreenshot = validScreenshots[0];

      const tradeData = {
        ...form,
        risk: Number(form.risk),
        pnl: Number(form.pnl),
        screenshots: validScreenshots,
        screenshot_type: primaryScreenshot?.type || 'link',
        screenshot_url: primaryScreenshot?.url || '',
      };

      if (mode === 'add') {
        const { error } = await createTrade(tradeData);
        if (error) {
          console.error('Error creating trade:', error);
          setFormError(`Gagal menyimpan ke database: ${error.message || error}`);
          setSaving(false);
          return;
        }
      } else if (mode === 'edit' && initialData?.id) {
        const { error } = await updateTrade(initialData.id, tradeData);
        if (error) {
          console.error('Error updating trade:', error);
          setFormError(`Gagal memperbarui ke database: ${error.message || error}`);
          setSaving(false);
          return;
        }
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan sistem saat menyimpan trade.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="trade-form-page">
        <div className="loading-spinner" style={{ margin: '100px auto' }} />
      </div>
    );
  }

  return (
    <div className="trade-form-page">
      <div className="trade-form-header">
        <Link href={mode === 'edit' ? '/history' : '/'} className="btn btn-ghost">
          <ArrowLeft size={20} />
        </Link>
        <h1>{mode === 'add' ? 'Add New Trade' : 'Edit Trade'}</h1>
      </div>

      {formError && (
        <div className="trade-error-banner animate-fade-in">
          <span>⚠️ {formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="trade-form">
        <div className="form-grid">
          {/* Trade Info */}
          <div className="form-section card">
            <h3 className="form-section-title">Trade Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pair</label>
                <CustomSelect
                  options={settings.pairs}
                  value={form.pair}
                  onChange={val => updateField('pair', val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Direction</label>
                <div className="direction-toggle">
                  <button type="button"
                    className={`direction-btn long ${form.direction === 'Long' ? 'active' : ''}`}
                    onClick={() => updateField('direction', 'Long')}>Long</button>
                  <button type="button"
                    className={`direction-btn short ${form.direction === 'Short' ? 'active' : ''}`}
                    onClick={() => updateField('direction', 'Short')}>Short</button>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Account</label>
              <CustomSelect
                options={settings.accounts}
                value={form.account}
                onChange={val => updateField('account', val)}
              />
            </div>
          </div>

          {/* Timing */}
          <div className="form-section card">
            <h3 className="form-section-title">Timing</h3>
            <div className="form-group">
              <label className="form-label">Date (Open Trade)</label>
              <div className="input-icon">
                <Calendar size={16} className="input-icon-svg" />
                <input type="datetime-local" className="form-input with-icon"
                  value={form.date_open}
                  onChange={e => updateField('date_open', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">End Trade</label>
              <div className="input-icon">
                <Calendar size={16} className="input-icon-svg" />
                <input type="datetime-local" className="form-input with-icon"
                  value={form.date_close}
                  onChange={e => updateField('date_close', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Risk & Result */}
          <div className="form-section card">
            <h3 className="form-section-title">Risk & Result</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Risk ($)</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  className="form-input"
                  placeholder="0.00" 
                  value={form.risk ?? ''}
                  onChange={e => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      updateField('risk', val);
                    }
                  }} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Profit/Loss ($)</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  className="form-input"
                  placeholder="0.00 (negatif = loss)" 
                  value={form.pnl ?? ''}
                  onChange={e => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      updateField('pnl', val);
                    }
                  }} 
                  required 
                />
              </div>
            </div>
            <div className="form-row auto-fields">
              <div className="form-group">
                <label className="form-label">Status (auto)</label>
                <div className="auto-value">
                  {status ? <StatusBadge status={status} /> : <span className="text-muted">—</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">R:R (auto)</label>
                <div className="auto-value auto-badge">{rr || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (auto)</label>
                <div className="auto-value">
                  <Clock size={14} /> {duration || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="form-section card">
            <h3 className="form-section-title">Analysis & Strategy</h3>
            
            {/* Row 1: Framework & Narrative */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Framework</label>
                <CustomSelect
                  options={['— Select —', ...settings.frameworks]}
                  value={form.framework || '— Select —'}
                  onChange={val => updateField('framework', val === '— Select —' ? '' : val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Narrative</label>
                <CustomSelect
                  options={['— Select —', ...settings.narratives]}
                  value={form.narrative || '— Select —'}
                  onChange={val => updateField('narrative', val === '— Select —' ? '' : val)}
                />
              </div>
            </div>

            {/* Row 2: Key Level HTF & Entry Model */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Key Level HTF</label>
                <CustomSelect
                  options={['— Select —', ...settings.keyLevels]}
                  value={form.key_level_htf || '— Select —'}
                  onChange={val => updateField('key_level_htf', val === '— Select —' ? '' : val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Model</label>
                <CustomSelect
                  options={['— Select —', ...settings.entryModels]}
                  value={form.entry_model || '— Select —'}
                  onChange={val => updateField('entry_model', val === '— Select —' ? '' : val)}
                />
              </div>
            </div>

            {/* Row 3: Confluences (Multi-Select Pills) */}
            <div className="form-group">
              <label className="form-label">Confluences (Bisa pilih lebih dari satu)</label>
              <div className="confluence-pills-wrap">
                {(settings.confluences || ['PSP', 'SMT', 'SSMT']).map(conf => {
                  const isSelected = form.confluences?.includes(conf);
                  return (
                    <button
                      key={conf}
                      type="button"
                      className={`confluence-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        const current = form.confluences || [];
                        const updated = isSelected 
                          ? current.filter(c => c !== conf)
                          : [...current, conf];
                        updateField('confluences', updated);
                      }}
                    >
                      <span className="confluence-dot" />
                      <span>{conf}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: Mistake */}
            <div className="form-group">
              <label className="form-label">Mistake</label>
              <CustomSelect
                options={settings.mistakes}
                value={form.mistake}
                onChange={val => updateField('mistake', val)}
              />
            </div>

            {/* Row 4: Market Profile (At the bottom for long text) */}
            <div className="form-group">
              <label className="form-label">Market Profile (Catatan Analisa/Setup)</label>
              <textarea 
                className="form-textarea"
                rows={3}
                placeholder="Contoh: M15 C2 Reversal + Asia High Sweep, menunggu konfirmasi CISD di M1..."
                value={form.market_profile}
                onChange={e => updateField('market_profile', e.target.value)}
              />
            </div>
          </div>

          {/* Multi-Timeframe Screenshots */}
          <div className="form-section card">
            <div className="form-section-header">
              <div>
                <h3 className="form-section-title">Charts & Screenshots (Multi-Timeframe)</h3>
                <p className="form-subtitle text-muted">Lampirkan chart TradingView atau upload gambar untuk setiap timeframe analisa</p>
              </div>
              <button 
                type="button" 
                className="btn btn-outline btn-sm add-screenshot-btn"
                onClick={addScreenshotItem}
              >
                <Plus size={14} /> Add Timeframe
              </button>
            </div>

            <div className="screenshots-list">
              {form.screenshots.map((ss, idx) => (
                <div key={ss.id} className="screenshot-item-card">
                  <div className="screenshot-item-header">
                    <div className="flex items-center gap-10">
                      <span className="screenshot-num-badge">#{idx + 1}</span>
                      <input
                        type="text"
                        className="form-input timeframe-input"
                        placeholder="e.g. HTF (Daily/H4) or LTF (M1)"
                        value={ss.timeframe}
                        onChange={e => updateScreenshotItem(ss.id, 'timeframe', e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="screenshot-toggle">
                        <button type="button"
                          className={`toggle-btn ${ss.type === 'link' ? 'active' : ''}`}
                          onClick={() => updateScreenshotItem(ss.id, 'type', 'link')}>
                          <Link2 size={13} /> Link
                        </button>
                        <button type="button"
                          className={`toggle-btn ${ss.type === 'upload' ? 'active' : ''}`}
                          onClick={() => updateScreenshotItem(ss.id, 'type', 'upload')}>
                          <Upload size={13} /> Upload
                        </button>
                      </div>

                      {form.screenshots.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm remove-screenshot-btn"
                          onClick={() => removeScreenshotItem(ss.id)}
                          title="Hapus screenshot ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {ss.type === 'link' ? (
                    <div className="screenshot-input-group mt-12">
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="Paste link snapshot TradingView (https://www.tradingview.com/x/...) atau URL gambar..."
                        value={ss.url}
                        onChange={e => updateScreenshotItem(ss.id, 'url', e.target.value)} 
                      />
                    </div>
                  ) : (
                    <div className="upload-area mt-12"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileUpload(ss.id, file);
                      }}>
                      {ss.url ? (
                        <div className="upload-preview">
                          <img src={ss.url} alt={`Screenshot ${ss.timeframe}`} />
                          <button type="button" className="btn btn-sm btn-outline"
                            onClick={() => updateScreenshotItem(ss.id, 'url', '')}>
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <label className="upload-placeholder">
                          <Camera size={28} />
                          <span>Drop image here or <strong>Browse</strong></span>
                          <input type="file" accept="image/*" hidden onChange={e => handleFileUpload(ss.id, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Live Direct Preview */}
                  {ss.url && ss.type === 'link' && (
                    <div className="live-preview-box mt-12">
                      <div className="flex items-center justify-between mb-8">
                        <span className="live-preview-label">
                          <ImageIcon size={13} /> Direct Preview ({ss.timeframe})
                        </span>
                        {isTradingViewUrl(ss.url) && (
                          <span className="tv-detected-badge">TradingView Linked ✓</span>
                        )}
                      </div>
                      <div className="preview-image-wrap">
                        <img 
                          src={normalizeChartUrl(ss.url)} 
                          alt="Chart preview" 
                          className="live-preview-img"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emotional State */}
          <div className="form-section card">
            <h3 className="form-section-title">Emotional State</h3>
            <div className="form-group">
              <label className="form-label">Before the Trade</label>
              <textarea className="form-textarea"
                placeholder="Bagaimana perasaanmu sebelum trade?"
                value={form.emotion_before}
                onChange={e => updateField('emotion_before', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">During the Trade</label>
              <textarea className="form-textarea"
                placeholder="Apa yang kamu rasakan saat trade berjalan?"
                value={form.emotion_during}
                onChange={e => updateField('emotion_during', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">After the Trade</label>
              <textarea className="form-textarea"
                placeholder="Bagaimana perasaanmu setelah trade selesai?"
                value={form.emotion_after}
                onChange={e => updateField('emotion_after', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="form-footer">
          <Link href={mode === 'edit' ? '/history' : '/'} className="btn btn-outline btn-lg">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving...' : (mode === 'add' ? 'Save Trade' : 'Update Trade')}
          </button>
        </div>
      </form>
    </div>
  );
}
