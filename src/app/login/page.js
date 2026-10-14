'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Delete, KeyRound, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { loginWithPin, checkIsAuthenticated } from '@/lib/auth';
import './login.css';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="loading-spinner" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const isExpired = searchParams?.get('reason') === 'expired';

  // If already authenticated, redirect to home
  useEffect(() => {
    if (checkIsAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  const handleDigit = useCallback((digit) => {
    if (pin.length < 6 && !success) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  }, [pin, success]);

  const handleDelete = useCallback(() => {
    if (pin.length > 0 && !success) {
      setPin(prev => prev.slice(0, -1));
      setError('');
    }
  }, [pin, success]);

  const handleClear = useCallback(() => {
    if (!success) {
      setPin('');
      setError('');
    }
  }, [success]);

  const verifyPin = async (inputPin) => {
    const isValid = await loginWithPin(inputPin);
    if (isValid) {
      setSuccess(true);
      setError('');
      setTimeout(() => {
        router.replace('/');
      }, 400);
    } else {
      setShake(true);
      setError('PIN salah! Silakan coba lagi.');
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 600);
    }
  };

  // Keyboard listener (physical keyboard support)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear]);

  return (
    <div className="login-page">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        
        {/* Dexornit Brand Logo */}
        <img 
          src="/LogoD_Horizontal Merah.png" 
          alt="Dexornit" 
          className="login-logo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/logo.png';
          }}
        />

        <h1 className="login-title">Private Journal Access</h1>
        <p className="login-subtitle">Masukkan 6 digit PIN untuk membuka jurnal trading pribadi Anda</p>

        {/* Expired Session Notice */}
        {isExpired && (
          <div className="session-expired-banner">
            <Clock size={14} />
            <span>Sesi berakhir (tidak aktif 1 jam). Masukkan PIN kembali.</span>
          </div>
        )}

        {/* 6 PIN Digit Indicator Boxes */}
        <div className="pin-display-wrap">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            const isActive = idx === pin.length && !success;
            const isError = Boolean(error);

            return (
              <div 
                key={idx} 
                className={`pin-digit-box ${isFilled ? 'filled' : ''} ${isActive ? 'active' : ''} ${isError ? 'error' : ''}`}
              >
                {isFilled ? (
                  success ? <CheckCircle2 size={18} className="text-success" /> : <div className="pin-dot" />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Error / Status Message */}
        <div className="login-error-msg">
          {error ? (
            <>
              <AlertCircle size={14} />
              <span>{error}</span>
            </>
          ) : success ? (
            <span className="text-success flex items-center gap-4">
              <CheckCircle2 size={14} /> PIN Valid. Membuka...
            </span>
          ) : null}
        </div>

        {/* Interactive Numeric Keypad */}
        <div className="numpad-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              className="numpad-btn"
              onClick={() => handleDigit(d)}
              disabled={success}
            >
              {d}
            </button>
          ))}

          <button
            type="button"
            className="numpad-btn action-btn"
            onClick={handleClear}
            disabled={success || pin.length === 0}
            title="Clear all"
          >
            Clear
          </button>

          <button
            type="button"
            className="numpad-btn"
            onClick={() => handleDigit('0')}
            disabled={success}
          >
            0
          </button>

          <button
            type="button"
            className="numpad-btn action-btn"
            onClick={handleDelete}
            disabled={success || pin.length === 0}
            title="Backspace"
          >
            <Delete size={18} />
          </button>
        </div>

        {/* Security Badge */}
        <div className="login-security-badge">
          <Lock size={12} />
          <span>Private Encrypted Session</span>
        </div>

      </div>
    </div>
  );
}
