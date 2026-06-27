import { useState, useRef, useEffect } from 'react';
import { WarningIcon } from './Icons.jsx';

const COVID_YEARS = new Set([2020, 2021]);
const YEARS = Array.from({ length: 22 }, (_, i) => 2002 + i);

export default function YearSelector({ year, onChange }) {
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef(null);
  const listRef               = useRef(null);
  const isCovid               = COVID_YEARS.has(year);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Scroll selected item into view when opening */
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  /* Keyboard nav */
  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
      return;
    }
    const idx = YEARS.indexOf(year);
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(YEARS[Math.min(idx + 1, YEARS.length - 1)]); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); onChange(YEARS[Math.max(idx - 1, 0)]); }
    if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
    if (e.key === 'Enter')     setOpen(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', userSelect: 'none' }}
      >
        Year
      </span>

      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Trigger button */}
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Year: ${year}`}
          onClick={() => setOpen(o => !o)}
          onKeyDown={onKeyDown}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px 4px 10px',
            fontSize: 14,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text-primary)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
            boxShadow: open ? `0 0 0 2px var(--color-brand-600)` : 'none',
            borderColor: open ? 'var(--color-brand-600)' : 'var(--color-border)',
            outline: 'none',
            userSelect: 'none',
          }}
        >
          {year}
          <svg
            width="10" height="6" viewBox="0 0 10 6" fill="none"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              transition: 'transform 0.15s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--color-text-muted)',
            }}
          >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown list */}
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Select year"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 200,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              padding: '4px',
              margin: 0,
              listStyle: 'none',
              width: 90,
              maxHeight: 220,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
            }}
          >
            {YEARS.map(y => {
              const isSelected = y === year;
              const isCovid    = COVID_YEARS.has(y);
              return (
                <li
                  key={y}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isSelected}
                  onClick={() => { onChange(y); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 14,
                    fontWeight: isSelected ? 700 : 400,
                    fontVariantNumeric: 'tabular-nums',
                    cursor: 'pointer',
                    color: isSelected ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                    background: isSelected ? 'var(--color-brand-50)' : 'transparent',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {y}
                  {isCovid && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-warning)',
                      letterSpacing: '0.04em',
                    }}>
                      COVID
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* COVID badge next to trigger */}
      {isCovid && (
        <span
          title="2020 and 2021 reflect COVID-19 disruption to commute patterns"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: 'var(--color-warning)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 6px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <WarningIcon size={12} /> COVID
        </span>
      )}
    </div>
  );
}
