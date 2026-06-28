import { useRef, useState } from 'react';
import PointCard from './PointCard.jsx';
import { WarningIcon } from './Icons.jsx';

export default function AnalysisPanel({
  points, overlapPairs, totalCommuters, year,
  onDelete, onRename, onReorder, onMoveToIndex, isNameDuplicate,
  matrixCells,
  setPointColor,
}) {
  const dragIdxRef    = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (idx) => { dragIdxRef.current = idx; };
  const handleDragOver  = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop      = (idx) => {
    setDragOverIdx(null);
    if (dragIdxRef.current !== null && dragIdxRef.current !== idx) {
      onMoveToIndex(dragIdxRef.current, idx);
    }
    dragIdxRef.current = null;
  };
  const handleDragEnd   = () => { dragIdxRef.current = null; setDragOverIdx(null); };

  // Compute per-point outbound (row) and inbound (col) totals from matrixCells
  const rowTotals = new Map();
  const colTotals = new Map();
  if (matrixCells) {
    for (const [, cell] of matrixCells) {
      rowTotals.set(cell.originPointId, (rowTotals.get(cell.originPointId) ?? 0) + cell.S000);
      colTotals.set(cell.destPointId,   (colTotals.get(cell.destPointId)   ?? 0) + cell.S000);
    }
  }

  const getOverlapNames = (id) =>
    overlapPairs
      .filter(([a, b]) => a === id || b === id)
      .map(([a, b]) => {
        const otherId = a === id ? b : a;
        return points.find(p => p.id === otherId)?.name ?? '?';
      });

  return (
    <div
      style={{
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-subtle)',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="section-label">Analysis Zones</span>
          {points.length > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: 'var(--color-brand-600)',
                color: '#fff',
                borderRadius: 'var(--radius-pill)',
                padding: '1px 7px',
                lineHeight: 1.6,
              }}
            >
              {points.length}
            </span>
          )}
        </div>

        {/* Point cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {points.map((p, idx) => (
            <PointCard
              key={p.id}
              point={p}
              index={idx}
              total={points.length}
              onDelete={onDelete}
              onRename={onRename}
              onReorder={onReorder}
              setPointColor={setPointColor}
              isNameDuplicate={isNameDuplicate}
              overlapNames={getOverlapNames(p.id)}
              outbound={rowTotals.get(p.id) ?? 0}
              inbound={colTotals.get(p.id) ?? 0}
              isDragOver={dragOverIdx === idx}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Empty / partial state text */}
        {points.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 4 }}>
            Click anywhere on the map to add your first zone.
          </p>
        )}
        {points.length === 1 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Add one more zone to see commuter flows.
          </p>
        )}
      </div>

      {/* ── Bottom stats section ── */}
      {points.length >= 2 && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div className="section-label" style={{ marginBottom: 2 }}>Total Commuters</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
            {totalCommuters.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            from {points.length} zones · {year}
          </div>
        </div>
      )}

      {/* ── Overlap alert ── */}
      {overlapPairs.length > 0 && (
        <div
          style={{
            margin: '0 10px 10px',
            padding: '8px 10px',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-warning)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <WarningIcon size={13} /> Overlapping Zones
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {overlapPairs.map(([a, b]) => {
              const nameA = points.find(p => p.id === a)?.name ?? '?';
              const nameB = points.find(p => p.id === b)?.name ?? '?';
              return `${nameA} & ${nameB}`;
            }).join('; ')} share H3 cells. Flows in shared cells are attributed to both zones.
          </div>
          <div style={{ marginTop: 4, color: 'var(--color-text-muted)' }}>
            Reduce Ring size or space zones further apart.
          </div>
        </div>
      )}
    </div>
  );
}
