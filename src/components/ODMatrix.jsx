import { useState, useRef, useEffect } from 'react';
import { matrixColor } from '../utils/colors.js';
import { useMatrixTooltip } from './FlowTooltip.jsx';
import { exportWide, exportLong } from '../utils/MatrixExport.js';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons.jsx';

/* ── Download dropdown ────────────────────────────────────────────────────── */
function DownloadMenu({ points, matrixCells, year }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary"
        style={{ fontSize: 13, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        Download
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            minWidth: 200,
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {[
            {
              label: 'Wide format (matrix)',
              desc:  'Matches visual layout · for sharing',
              fn:    () => exportWide(points, matrixCells, year),
            },
            {
              label: 'Long format (tidy)',
              desc:  'One row per pair · for R / Python',
              fn:    () => exportLong(points, matrixCells, year),
            },
          ].map(({ label, desc, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); setOpen(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                color: 'var(--color-text-primary)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ODMatrix ────────────────────────────────────────────────────────── */
export default function ODMatrix({ points, matrixCells, year, totalCommuters }) {
  const { show, move, hide, element: tooltipElement } = useMatrixTooltip();

  if (points.length < 2) return null;

  const maxVal = Math.max(...[...matrixCells.values()].map(c => c.S000), 1);

  const rowTotals = new Map();
  const colTotals = new Map();
  for (const [, cell] of matrixCells) {
    rowTotals.set(cell.originPointId, (rowTotals.get(cell.originPointId) ?? 0) + cell.S000);
    colTotals.set(cell.destPointId,   (colTotals.get(cell.destPointId)   ?? 0) + cell.S000);
  }

  const rotateHeaders = points.length >= 4;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-surface)' }}>

      {/* ── Sticky header bar ── */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface)',
          flexShrink: 0,
          zIndex: 3,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Origin-Destination Matrix
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 8 }}>
            {year} · {points.length} zones · {totalCommuters.toLocaleString()} commuters
          </span>
        </div>
        <DownloadMenu points={points} matrixCells={matrixCells} year={year} />
      </div>

      {/* ── Scrollable table area ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>

        {/* DESTINATION axis label */}
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 4,
            paddingLeft: 120, /* indent past the ORIGIN label column */
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={12} />
            Destination — where workers are employed
            <ArrowRightIcon size={12} />
          </span>
        </div>

        <div style={{ display: 'flex' }}>
          {/* ORIGIN axis label (rotated) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-text-secondary)',
              width: 20,
              flexShrink: 0,
              paddingBottom: 40, /* offset past the totals row */
            }}
          >
            Origin — where workers live
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table
              style={{
                borderCollapse: 'collapse',
                fontSize: 13,
                tableLayout: 'fixed',
                minWidth: '100%',
              }}
            >
              <thead>
                <tr>
                  {/* Corner cell */}
                  <th
                    style={{
                      ...thBase,
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      width: 130,
                      minWidth: 130,
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      textAlign: 'left',
                      fontWeight: 400,
                    }}
                  >
                    <div style={{ position: 'relative', minHeight: 32 }}>
                      <svg
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
                        aria-hidden="true"
                      >
                        <line x1="0" y1="100%" x2="100%" y2="0" stroke="var(--color-border)" strokeWidth="1" />
                      </svg>
                      <span style={{ position: 'absolute', bottom: 2, left: 3, fontSize: 10, lineHeight: 1 }}>Origin</span>
                      <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 10, lineHeight: 1 }}>Dest</span>
                    </div>
                  </th>

                  {/* Destination column headers */}
                  {points.map(p => (
                    <th
                      key={p.id}
                      style={{
                        ...thBase,
                        width: 110,
                        minWidth: 90,
                        maxWidth: 130,
                        ...(rotateHeaders ? {
                          height: 80,
                          verticalAlign: 'bottom',
                          paddingBottom: 8,
                        } : {}),
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: rotateHeaders ? 'flex-start' : 'center',
                          gap: 4,
                          ...(rotateHeaders ? {
                            transform: 'rotate(-45deg)',
                            transformOrigin: 'bottom left',
                            whiteSpace: 'nowrap',
                            width: 'max-content',
                            marginLeft: 8,
                          } : {}),
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: p.color,
                            flexShrink: 0,
                          }}
                        />
                        {p.name}
                      </div>
                    </th>
                  ))}

                  {/* Outbound total header */}
                  <th
                    style={{
                      ...thBase,
                      ...totalHeaderStyle,
                      width: 110,
                      minWidth: 90,
                    }}
                  >
                    OUTBOUND<br />TOTAL
                  </th>
                </tr>
              </thead>

              <tbody>
                {points.map(origin => {
                  return (
                    <tr key={origin.id}>
                      {/* Origin row header (sticky) */}
                      <td
                        style={{
                          ...tdBase,
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          background: 'var(--color-surface)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: origin.color,
                              flexShrink: 0,
                            }}
                          />
                          {origin.name}
                        </div>
                      </td>

                      {/* Data cells */}
                      {points.map(dest => {
                        const isSelf = origin.id === dest.id;
                        const cell   = matrixCells.get(`${origin.id}|${dest.id}`);
                        const val    = cell?.S000 ?? 0;
                        const bg     = isSelf
                          ? 'repeating-linear-gradient(45deg, var(--color-surface-raised), var(--color-surface-raised) 2px, var(--color-surface) 2px, var(--color-surface) 8px)'
                          : (matrixColor(val, maxVal) ?? 'var(--color-surface)');

                        return (
                          <td
                            key={dest.id}
                            title={isSelf ? 'Intra-zonal: workers living and working within the same zone' : undefined}
                            style={{
                              ...tdBase,
                              background: bg,
                              textAlign: 'right',
                              cursor: val ? 'pointer' : 'default',
                              position: 'relative',
                            }}
                            onMouseEnter={val ? (e) => show(e, cell, origin.name, dest.name, origin.color, dest.color) : undefined}
                            onMouseMove={val  ? (e) => move(e) : undefined}
                            onMouseLeave={val ? hide : undefined}
                          >
                            {isSelf ? (
                              val ? (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                                  {val.toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                              )
                            ) : val ? (
                              val.toLocaleString()
                            ) : (
                              <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Outbound total */}
                      <td style={{ ...tdBase, ...totalCellStyle, textAlign: 'right' }}>
                        {(rowTotals.get(origin.id) ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {/* Inbound totals row */}
                <tr>
                  <td
                    style={{
                      ...tdBase,
                      ...totalCellStyle,
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    INBOUND TOTAL
                  </td>
                  {points.map(dest => (
                    <td key={dest.id} style={{ ...tdBase, ...totalCellStyle, textAlign: 'right' }}>
                      {(colTotals.get(dest.id) ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td style={{ ...tdBase, background: 'var(--color-surface-raised)' }} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Hover any cell for wage + industry breakdown.
        </p>
      </div>

      {tooltipElement}
    </div>
  );
}

/* ── Shared cell styles ───────────────────────────────────────────────────── */
const thBase = {
  padding: '6px 10px',
  borderBottom: '2px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  fontWeight: 700,
  fontSize: 13,
  color: 'var(--color-text-primary)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const tdBase = {
  padding: '5px 10px',
  border: '1px solid var(--color-border)',
  fontSize: 13,
  color: 'var(--color-text-primary)',
};

const totalHeaderStyle = {
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const totalCellStyle = {
  background: 'var(--color-surface-raised)',
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
};
