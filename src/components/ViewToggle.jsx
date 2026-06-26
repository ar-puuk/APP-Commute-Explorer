export default function ViewToggle({ activeView, onChange }) {
  const btn = (label, view) => (
    <button
      onClick={() => onChange(view)}
      aria-pressed={activeView === view}
      style={{
        padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        borderRadius: 4, border: '1px solid #d1d5db',
        background: activeView === view ? '#2563eb' : '#fff',
        color: activeView === view ? '#fff' : '#374151',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {btn('Map view', 'map')}
      {btn('Matrix view', 'matrix')}
    </div>
  );
}
