const MapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <polygon points="1,2 5,1 9,3 13,1 13,12 9,10 5,12 1,11" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    <line x1="5" y1="1" x2="5" y2="12" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="9" y1="3" x2="9" y2="10" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

const TABS = [
  { view: 'map',    label: 'Map',    Icon: MapIcon  },
  { view: 'matrix', label: 'Matrix', Icon: GridIcon },
];

export default function ViewToggle({ activeView, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-pill)',
        overflow: 'hidden',
      }}
      role="group"
      aria-label="View mode"
    >
      {TABS.map(({ view, label, Icon }) => {
        const active = activeView === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-pressed={active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--color-brand-600)' : 'var(--color-surface)',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              transition: 'background 0.15s ease, color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon />
            {label}
          </button>
        );
      })}
    </div>
  );
}
