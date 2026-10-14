'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  className = '',
  style = {},
  disabled = false,
  label = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    const val = typeof opt === 'object' ? opt.value : opt;
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  const displayValue = () => {
    if (!value && value !== 0) return placeholder;
    const found = options.find(o => (typeof o === 'object' ? o.value : o) === value);
    if (found) {
      return typeof found === 'object' ? found.label : found;
    }
    return value;
  };

  return (
    <div 
      className={`custom-select-container ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={dropdownRef}
      style={style}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`custom-select-value ${!value && value !== 0 ? 'placeholder' : ''}`}>
          {displayValue()}
        </span>
        <ChevronDown size={16} className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown animate-scale-in" role="listbox">
          <div className="custom-select-options">
            {options.map((opt, idx) => {
              const optVal = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              const isSelected = optVal === value;

              return (
                <div
                  key={idx}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="option-label">{optLabel}</span>
                  {isSelected && <Check size={14} className="option-check" />}
                </div>
              );
            })}
            {options.length === 0 && (
              <div className="custom-select-empty">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
