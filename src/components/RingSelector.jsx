import { PlusIcon, MinusIcon, WarningIcon } from './Icons.jsx';

const CELL_COUNTS = (k) => k === 0 ? 1 : 3 * k * (k + 1) + 1;
const AREA_HINTS  = [0.04, 0.3, 0.8, 1.6, 2.6, 3.9, 5.4]; // mi² for k=0..6

const TOOLTIP_TEXT =
  'Number of H3 rings expanded around each clicked cell.\n' +
  'Larger rings capture wider catchment areas but increase overlap risk and query time.\n\n' +
  'k=0: 1 cell  (~0.04 mi²)\n' +
  'k=1: 7 cells  (~0.3 mi²)\n' +
  'k=2: 19 cells (~0.8 mi²)\n' +
  'k=3: 37 cells (~1.6 mi²)\n' +
  'k=4: 61 cells (~2.6 mi²)\n' +
  'k=5: 91 cells (~3.9 mi²)\n' +
  'k=6: 127 cells (~5.4 mi²)';

const divider = {
  width: 1,
  alignSelf: 'stretch',
  background: 'var(--color-border)',
  flexShrink: 0,
};

export default function RingSelector({ kRing, onChange }) {
  const cells    = CELL_COUNTS(kRing);
  const areaHint = kRing <= 6 ? AREA_HINTS[kRing] : null;
  const warn     = kRing > 5;

  const dec = () => { if (kRing > 0) onChange(kRing - 1); };
  const inc = () => onChange(kRing + 1);

  const handleInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0) onChange(val);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Label */}
      <span
        title={TOOLTIP_TEXT}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        Ring
      </span>

      {/* Stepper pill: [−  value  +] */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          height: 28,
        }}
      >
        <button
          type="button"
          aria-label="Decrease ring size"
          onClick={dec}
          disabled={kRing === 0}
          style={{
            width: 28,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'var(--color-surface)',
            color: kRing === 0 ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
            cursor: kRing === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.1s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (kRing > 0) e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
        >
          <MinusIcon size={12} />
        </button>

        <div style={divider} />

        <input
          type="number"
          min="0"
          step="1"
          value={kRing}
          onChange={handleInput}
          aria-label="Ring size"
          style={{
            width: 36,
            height: '100%',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: warn ? 'var(--color-warning)' : 'var(--color-text-primary)',
            background: 'var(--color-surface)',
            border: 'none',
            outline: 'none',
            appearance: 'textfield',
            MozAppearance: 'textfield',
            padding: 0,
          }}
        />

        <div style={divider} />

        <button
          type="button"
          aria-label="Increase ring size"
          onClick={inc}
          style={{
            width: 28,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'background 0.1s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
        >
          <PlusIcon size={12} />
        </button>
      </div>

      {/* Secondary info */}
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {cells.toLocaleString()} {cells === 1 ? 'cell' : 'cells'}
        {areaHint !== null && (
          <span style={{ color: 'var(--color-text-disabled)', marginLeft: 3 }}>
            · ~{areaHint} mi²
          </span>
        )}
      </span>

      {/* Warning — inline, compact */}
      {warn && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-warning)', whiteSpace: 'nowrap' }}>
          <WarningIcon size={11} /> Slow
        </span>
      )}
    </div>
  );
}
