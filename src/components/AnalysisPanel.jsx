import { useRef, useState, useCallback } from 'react';
import PointCard from './PointCard.jsx';
import { WarningIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';

const MIN_W     = 200;
const MAX_W     = 600;
const DEFAULT_W = 320;
const TOGGLE_W  = 20;
const LS_KEY    = 'commute-sidebar-w';

function readSavedWidth() {
  try {
    const n = parseInt(localStorage.getItem(LS_KEY), 10);
    return isFinite(n) && n >= MIN_W && n <= MAX_W ? n : DEFAULT_W;
  } catch { return DEFAULT_W; }
}

export default function AnalysisPanel({
  points, overlapPairs, totalCommuters, year,
  onDelete, onRename, onReorder, onMoveToIndex, isNameDuplicate,
  matrixCells,
  setPointColor,
}) {
  /* ── Card drag-to-reorder ─────────────────────────────────────────────── */
  const dragIdxRef    = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (idx) => { dragIdxRef.current = idx; };
  const handleDragOver  = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop      = (idx) => {
    setDragOverIdx(null);
    if (dragIdxRef.current !== null && dragIdxRef.current !== idx)
      onMoveToIndex(dragIdxRef.current, idx);
    dragIdxRef.current = null;
  };
  const handleDragEnd = () => { dragIdxRef.current = null; setDragOverIdx(null); };

  /* ── Panel width / collapse ───────────────────────────────────────────── */
  const [width,     setWidth]     = useState(readSavedWidth);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing,  setResizing]  = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const startResize = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    setResizing(true);

    const onMove = (e) => {
      const newW = Math.max(MIN_W, Math.min(MAX_W, startW + e.clientX - startX));
      setWidth(newW);
    };

    const onUp = () => {
      try { localStorage.setItem(LS_KEY, String(widthRef.current)); } catch {}
      setResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  /* ── OD per-point totals ──────────────────────────────────────────────── */
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

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    /*
     * overflow:visible on the outer shell lets the toggle tab protrude into the
     * map area without taking up flex space. The inner wrapper carries
     * overflow:hidden so the collapse-width animation still clips content cleanly.
     */
    <div
      style={{
        width: collapsed ? 0 : width,
        flexShrink: 0,
        position: 'relative',
        background: 'var(--color-surface-subtle)',
        borderRight: '1px solid var(--color-border)',
        overflow: 'visible',
        transition: resizing ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── Inner clip wrapper — fills panel bounds, clips during animation ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Main content ── */}
        {!collapsed && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span className="section-label" style={{ flex: 1 }}>Analysis Zones</span>
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

            {/* ── Bottom stats ── */}
            {points.length >= 2 && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
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
          </>
        )}

        {/* ── Resize handle (expanded only) ── */}
        {!collapsed && (
          <div
            onMouseDown={startResize}
            title="Drag to resize"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 4,
              cursor: 'col-resize',
              zIndex: 5,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-600)'; e.currentTarget.style.opacity = '0.4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '1'; }}
          />
        )}
      </div>

      {/* ── Collapse / expand pill-tab ──────────────────────────────────────────
           Positioned outside the clip wrapper so it protrudes into the map area.
           right: -TOGGLE_W places the tab's left edge flush with the panel border.
      ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        style={{
          position: 'absolute',
          right: -TOGGLE_W,
          top: '50%',
          transform: 'translateY(-50%)',
          width: TOGGLE_W,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0 8px 8px 0',
          border: '1px solid var(--color-border)',
          borderLeft: 'none',
          background: 'var(--color-surface-elevated)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          zIndex: 20,
          padding: 0,
          boxShadow: '2px 0 8px rgba(0,0,0,0.07)',
          transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-brand-600)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.boxShadow = '2px 0 12px rgba(0,0,0,0.14)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--color-surface-elevated)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.boxShadow = '2px 0 8px rgba(0,0,0,0.07)';
        }}
      >
        {collapsed ? <ChevronRightIcon size={11} /> : <ChevronLeftIcon size={11} />}
      </button>
    </div>
  );
}
