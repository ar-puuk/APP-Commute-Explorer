import { useState } from 'react';
import { matrixColor } from '../utils/colors.js';

function FlowTooltip({ cell, originName, destName }) {
  if (!cell || !cell.S000) return null;
  const pct = (n) => cell.S000 ? `${Math.round(n / cell.S000 * 100)}%` : '—';
  return (
    <div style={{
      position: 'fixed', zIndex: 9999, background: '#fff', border: '1px solid #d1d5db',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      fontSize: 12, minWidth: 220, pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{originName} → {destName}</div>
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>
        <Row label="Total commuters" value={cell.S000.toLocaleString()} bold />
        <Row label="Low wage (SA01)"  value={cell.SA01.toLocaleString()} pct={pct(cell.SA01)} />
        <Row label="Mid wage (SA02)"  value={cell.SA02.toLocaleString()} pct={pct(cell.SA02)} />
        <Row label="High wage (SA03)" value={cell.SA03.toLocaleString()} pct={pct(cell.SA03)} />
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 6 }}>
        <Row label="Goods-producing (SI01)"   value={cell.SI01.toLocaleString()} pct={pct(cell.SI01)} />
        <Row label="Trade/transport (SI02)"   value={cell.SI02.toLocaleString()} pct={pct(cell.SI02)} />
        <Row label="Other services (SI03)"    value={cell.SI03.toLocaleString()} pct={pct(cell.SI03)} />
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
          ⓘ Industry reflects job type at destination
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, pct, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2, fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}{pct ? <span style={{ color: '#6b7280', marginLeft: 6 }}>{pct}</span> : null}</span>
    </div>
  );
}

export default function ODMatrix({ points, matrixCells }) {
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (points.length < 2) return null;

  const maxVal = Math.max(...[...matrixCells.values()].map(c => c.S000), 1);

  const rowTotals = new Map();
  const colTotals = new Map();
  for (const [key, cell] of matrixCells) {
    rowTotals.set(cell.originPointId, (rowTotals.get(cell.originPointId) ?? 0) + cell.S000);
    colTotals.set(cell.destPointId,   (colTotals.get(cell.destPointId)   ?? 0) + cell.S000);
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#fff' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}></th>
            {points.map(p => (
              <th key={p.id} style={{ ...thStyle, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: p.color }}>●</span> {p.name}
              </th>
            ))}
            <th style={{ ...thStyle, fontWeight: 700 }}>TOTAL →</th>
          </tr>
        </thead>
        <tbody>
          {points.map(origin => (
            <tr key={origin.id}>
              <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span style={{ color: origin.color }}>●</span> {origin.name}
              </td>
              {points.map(dest => {
                const cell = matrixCells.get(`${origin.id}|${dest.id}`);
                const val = cell?.S000 ?? 0;
                const bg = matrixColor(val, maxVal);
                return (
                  <td
                    key={dest.id}
                    style={{ ...tdStyle, background: bg ?? '#fff', textAlign: 'right', cursor: val ? 'pointer' : 'default' }}
                    onMouseEnter={val ? (e) => { setTooltip({ cell, originName: origin.name, destName: dest.name }); setTooltipPos({ x: e.clientX + 12, y: e.clientY - 12 }); } : undefined}
                    onMouseMove={val ? (e) => setTooltipPos({ x: e.clientX + 12, y: e.clientY - 12 }) : undefined}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {val ? val.toLocaleString() : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                );
              })}
              <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>
                {(rowTotals.get(origin.id) ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAL ↓</td>
            {points.map(dest => (
              <td key={dest.id} style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>
                {(colTotals.get(dest.id) ?? 0).toLocaleString()}
              </td>
            ))}
            <td style={{ ...tdStyle }} />
          </tr>
        </tbody>
      </table>

      {tooltip && (
        <div style={{ position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999 }}>
          <FlowTooltip {...tooltip} />
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '6px 10px', borderBottom: '2px solid #e5e7eb',
  textAlign: 'left', fontWeight: 700, background: '#f9fafb', fontSize: 12,
};
const tdStyle = {
  padding: '5px 10px', border: '1px solid #e5e7eb', fontSize: 12,
};
