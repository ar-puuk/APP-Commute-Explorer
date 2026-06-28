export default function FlowLegend({ flows }) {
  if (!flows || flows.length === 0) return null;

  const counts = flows.map(f => f.count).filter(Boolean);
  if (counts.length === 0) return null;

  const minVal = Math.min(...counts);
  const maxVal = Math.max(...counts);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 96,
        right: 12,
        width: 260,
        padding: '10px 12px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div className="section-label" style={{ marginBottom: 8 }}>Flow Volume</div>

      {/* GnBu gradient bar — exact stops from colors.js */}
      <div
        style={{
          height: 10,
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(to right, #f7fcf0, #ccebc5, #7bccc4, #2b8cbe, #084081)',
          marginBottom: 4,
        }}
      />

      {/* Min / max labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)' }}>
        <span>{minVal.toLocaleString()}</span>
        <span>{maxVal.toLocaleString()}</span>
      </div>
    </div>
  );
}
