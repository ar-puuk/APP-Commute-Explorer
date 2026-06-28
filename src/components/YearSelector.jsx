import { WarningIcon } from './Icons.jsx';

const COVID_YEARS = new Set([2020, 2021]);
const MIN_YEAR = 2002;
const MAX_YEAR = 2023;

export default function YearSelector({ year, onChange }) {
  const isCovid = COVID_YEARS.has(year);

  const dec = () => onChange(Math.max(MIN_YEAR, year - 1));
  const inc = () => onChange(Math.min(MAX_YEAR, year + 1));

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { e.preventDefault(); dec(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { e.preventDefault(); inc(); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none' }}>
        Year
      </span>

      <div
        role="group"
        aria-label="Data year"
        style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 30 }}
      >
        <button
          type="button"
          aria-label="Previous year"
          onClick={dec}
          onKeyDown={handleKeyDown}
          disabled={year <= MIN_YEAR}
          style={{ width: 26, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: year <= MIN_YEAR ? 'var(--color-text-disabled)' : 'var(--color-text-muted)', cursor: year <= MIN_YEAR ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 300, flexShrink: 0 }}
        >
          ‹
        </button>

        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', padding: '0 8px', minWidth: 44, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums', userSelect: 'none' }}>
          {year}
        </span>

        <button
          type="button"
          aria-label="Next year"
          onClick={inc}
          onKeyDown={handleKeyDown}
          disabled={year >= MAX_YEAR}
          style={{ width: 26, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: year >= MAX_YEAR ? 'var(--color-text-disabled)' : 'var(--color-text-muted)', cursor: year >= MAX_YEAR ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 300, flexShrink: 0 }}
        >
          ›
        </button>
      </div>

      {isCovid && (
        <span
          title="2020 and 2021 reflect COVID-19 disruption to commute patterns"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)', borderRadius: 'var(--radius-pill)', padding: '2px 6px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          <WarningIcon size={11} /> COVID
        </span>
      )}
    </div>
  );
}
