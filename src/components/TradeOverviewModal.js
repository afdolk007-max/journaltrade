'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  X, Calendar, Clock, DollarSign, TrendingUp, AlertCircle, 
  ExternalLink, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  Smile, ShieldAlert, Layers, Image as ImageIcon, Maximize2
} from 'lucide-react';
import { formatDateTime, formatCurrency, calculateDuration, normalizeChartUrl, isTradingViewUrl, getTradingViewWebUrl } from '@/lib/utils';
import { DirectionBadge, StatusBadge, MistakeBadge } from '@/components/Badge';
import './TradeOverviewModal.css';

export default function TradeOverviewModal({ trade, onClose, onDelete }) {
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!trade) return null;

  const isWin = trade.status === 'Win';

  // Build unified screenshots list (support both new screenshots array and legacy screenshot_url)
  let screenshotsList = [];
  if (trade.screenshots && Array.isArray(trade.screenshots) && trade.screenshots.length > 0) {
    screenshotsList = trade.screenshots.filter(s => s.url?.trim());
  } else if (trade.screenshot_url?.trim()) {
    screenshotsList = [
      {
        id: 'legacy-1',
        timeframe: 'Primary Chart',
        type: trade.screenshot_type || 'link',
        url: trade.screenshot_url
      }
    ];
  }

  const currentScreenshot = screenshotsList[activeScreenshotIdx] || screenshotsList[0];
  const currentImageUrl = currentScreenshot ? normalizeChartUrl(currentScreenshot.url) : '';

  return (
    <>
      <div className="trade-modal-overlay" onClick={onClose}>
        <div className="trade-modal-container" onClick={e => e.stopPropagation()}>
          
          {/* Modal Header */}
          <div className="trade-modal-header">
            <div className="trade-modal-header-main">
              <div className="trade-modal-pair-row">
                <h2 className="trade-modal-pair">{trade.pair}</h2>
                <div className="trade-modal-badges">
                  <DirectionBadge direction={trade.direction} />
                  <StatusBadge status={trade.status} />
                </div>
              </div>
              <span className="trade-modal-account">{trade.account}</span>
            </div>

            <div className="trade-modal-header-side">
              <div className={`trade-modal-pnl ${isWin ? 'win' : 'loss'}`}>
                {Number(trade.pnl) > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
              </div>
              <button className="trade-modal-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="trade-modal-body">

            {/* Quick Metrics Grid */}
            <div className="trade-quick-metrics">
              <div className="quick-metric-card">
                <span className="metric-label">Risk ($)</span>
                <span className="metric-val">{formatCurrency(trade.risk)}</span>
              </div>
              <div className="quick-metric-card">
                <span className="metric-label">R:R Ratio</span>
                <span className="metric-val font-mono">{trade.rr === -1 ? '-1' : `1:${trade.rr}`}</span>
              </div>
              <div className="quick-metric-card">
                <span className="metric-label">Duration</span>
                <span className="metric-val">{trade.trade_duration || calculateDuration(trade.date_open, trade.date_close) || '—'}</span>
              </div>
              <div className="quick-metric-card">
                <span className="metric-label">Mistake Rule</span>
                <div className="mt-2"><MistakeBadge mistake={trade.mistake} /></div>
              </div>
            </div>

            {/* Timing Row */}
            <div className="trade-timing-card">
              <div className="timing-item">
                <Calendar size={14} className="text-muted" />
                <span><strong>Open:</strong> {formatDateTime(trade.date_open)}</span>
              </div>
              <div className="timing-item">
                <Clock size={14} className="text-muted" />
                <span><strong>Close:</strong> {formatDateTime(trade.date_close)}</span>
              </div>
            </div>

            {/* Analysis & Technical Strategy Breakdown (1 baris 1 baris ke bawah) */}
            <div className="trade-section-box">
              <h4 className="trade-section-title">
                <Layers size={15} />
                Technical Setup & Execution
              </h4>
              
              <div className="trade-technical-list">
                <div className="technical-row-item">
                  <span className="tech-row-label">Framework</span>
                  <span className="tech-row-value">{trade.framework || '—'}</span>
                </div>
                <div className="technical-row-item">
                  <span className="tech-row-label">Narrative</span>
                  <span className="tech-row-value">{trade.narrative || '—'}</span>
                </div>
                <div className="technical-row-item">
                  <span className="tech-row-label">Key Level HTF</span>
                  <span className="tech-row-value">{trade.key_level_htf || '—'}</span>
                </div>
                <div className="technical-row-item">
                  <span className="tech-row-label">Entry Model</span>
                  <span className="tech-row-value">{trade.entry_model || '—'}</span>
                </div>
                {((trade.confluences && trade.confluences.length > 0) || trade.confluence) && (
                  <div className="technical-row-item">
                    <span className="tech-row-label">Confluences</span>
                    <div className="flex items-center gap-6 flex-wrap">
                      {(Array.isArray(trade.confluences) ? trade.confluences : (trade.confluence ? [trade.confluence] : [])).map(c => (
                        <span key={c} className="badge badge-purple font-semibold">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Market Profile (Full width at the bottom for long text) */}
              <div className="market-profile-box mt-12">
                <span className="tech-row-label">Market Profile</span>
                <p className="market-profile-text">{trade.market_profile || '—'}</p>
              </div>
            </div>

            {/* Multi-Timeframe Screenshot Gallery */}
            {screenshotsList.length > 0 && (
              <div className="trade-section-box">
                <div className="screenshot-gallery-header">
                  <h4 className="trade-section-title mb-0">
                    <ImageIcon size={16} />
                    Charts & Screenshots ({screenshotsList.length} Timeframe)
                  </h4>
                  
                  {isTradingViewUrl(currentScreenshot.url) && (
                    <a 
                      href={getTradingViewWebUrl(currentScreenshot.url)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="tradingview-link-btn"
                    >
                      Open in TradingView <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Timeframe Tabs */}
                {screenshotsList.length > 1 && (
                  <div className="timeframe-gallery-tabs">
                    {screenshotsList.map((ss, idx) => (
                      <button
                        key={ss.id || idx}
                        type="button"
                        className={`tf-tab-btn ${activeScreenshotIdx === idx ? 'active' : ''}`}
                        onClick={() => setActiveScreenshotIdx(idx)}
                      >
                        {ss.timeframe || `Timeframe ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Current Active Image Display */}
                {currentImageUrl ? (
                  <div className="screenshot-container" onClick={() => setLightboxOpen(true)}>
                    <img 
                      src={currentImageUrl} 
                      alt={`Chart ${currentScreenshot.timeframe}`}
                      className="screenshot-img"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                    <div className="screenshot-zoom-overlay">
                      <Maximize2 size={16} /> Click to Fullscreen Zoom
                    </div>
                  </div>
                ) : (
                  <div className="text-muted text-center" style={{ padding: 20 }}>
                    Gambar tidak dapat dimuat
                  </div>
                )}
              </div>
            )}

            {/* Emotional State Reflection */}
            {(trade.emotion_before || trade.emotion_during || trade.emotion_after) && (
              <div className="trade-section-box">
                <h4 className="trade-section-title">
                  <Smile size={15} />
                  Psychology & Emotional State
                </h4>
                <div className="emotion-cards-grid">
                  {trade.emotion_before && (
                    <div className="emotion-bubble before">
                      <span className="emotion-bubble-tag">Before Trade</span>
                      <p>{trade.emotion_before}</p>
                    </div>
                  )}
                  {trade.emotion_during && (
                    <div className="emotion-bubble during">
                      <span className="emotion-bubble-tag">During Trade</span>
                      <p>{trade.emotion_during}</p>
                    </div>
                  )}
                  {trade.emotion_after && (
                    <div className="emotion-bubble after">
                      <span className="emotion-bubble-tag">After Trade</span>
                      <p>{trade.emotion_after}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Modal Actions Footer */}
          <div className="trade-modal-footer">
            <button 
              type="button" 
              className="btn btn-outline btn-sm text-danger"
              onClick={() => onDelete(trade.id)}
            >
              <Trash2 size={15} /> Delete
            </button>

            <div className="flex items-center gap-8">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Close
              </button>
              <Link 
                href={`/edit-trade/${trade.id}`} 
                className="btn btn-primary btn-sm"
                onClick={onClose}
              >
                <Edit2 size={14} /> Edit Trade
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox Modal (Fullscreen Zoom) */}
      {lightboxOpen && currentImageUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
              <X size={24} />
            </button>
            <div className="lightbox-header">
              <span>{trade.pair} — {currentScreenshot?.timeframe}</span>
            </div>
            <img 
              src={currentImageUrl} 
              alt="Fullscreen chart view" 
              className="lightbox-img" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </>
  );
}
