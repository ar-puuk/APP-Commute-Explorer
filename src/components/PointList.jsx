import { useState } from 'react';
import CrossStateBadge from './CrossStateBadge.jsx';

export default function PointList({
  points, overlapPairs, totalCommuters,
  onDelete, onRename, onReorder, isNameDuplicate,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditValue(p.name);
    setEditError('');
  };

  const commitEdit = (id) => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    if (isNameDuplicate(trimmed, id)) { setEditError('Name already in use'); return; }
    onRename(id, trimmed);
    setEditingId(null);
    setEditError('');
  };

  const getOverlapNames = (id) => {
    return overlapPairs
      .filter(([a, b]) => a === id || b === id)
      .map(([a, b]) => {
        const otherId = a === id ? b : a;
        return points.find(p => p.id === otherId)?.name ?? '?';
      });
  };

  return (
    <div style={{ padding: '8px 12px', overflowY: 'auto', flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#374151' }}>
        Analysis Points
      </div>

      {points.length === 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
          Click anywhere on the map to add a point.
        </div>
      )}

      {points.map((p, idx) => {
        const overlaps = getOverlapNames(p.id);
        return (
          <div key={p.id} style={{ marginBottom: 8, borderRadius: 6, background: '#f9fafb', border: '1px solid #e5e7eb', padding: '6px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', minWidth: 16 }}>{idx + 1}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />

              {editingId === p.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => { setEditValue(e.target.value); setEditError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(p.id);
                    if (e.key === 'Escape') { setEditingId(null); setEditError(''); }
                  }}
                  style={{ flex: 1, fontSize: 12, padding: '1px 4px', borderRadius: 3, border: '1px solid #2563eb' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{p.name}</span>
              )}

              <div style={{ display: 'flex', gap: 2 }}>
                <button aria-label="Move up"   onClick={() => onReorder(p.id, 'up')}   style={btnStyle}>↑</button>
                <button aria-label="Move down" onClick={() => onReorder(p.id, 'down')} style={btnStyle}>↓</button>
                <button aria-label="Rename"    onClick={() => editingId === p.id ? commitEdit(p.id) : startEdit(p)} style={btnStyle}>✎</button>
                <button aria-label="Delete"    onClick={() => onDelete(p.id)} style={{ ...btnStyle, color: '#ef4444' }}>×</button>
              </div>
            </div>

            <div style={{ marginLeft: 34, marginTop: 2 }}>
              <CrossStateBadge countyName={p.countyName} />
            </div>

            {editError && editingId === p.id && (
              <div style={{ marginLeft: 34, fontSize: 11, color: '#ef4444', marginTop: 2 }}>{editError}</div>
            )}

            {overlaps.length > 0 && (
              <div style={{ marginLeft: 34, fontSize: 11, color: '#b45309', marginTop: 3 }}>
                ⚠ Ring overlaps with {overlaps.join(', ')}
              </div>
            )}
          </div>
        );
      })}

      {overlapPairs.length > 0 && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
          padding: '6px 10px', fontSize: 11, color: '#92400e', marginTop: 4,
        }}>
          ⚠ Rings overlap between {overlapPairs.map(([a, b]) => {
            const nameA = points.find(p => p.id === a)?.name ?? '?';
            const nameB = points.find(p => p.id === b)?.name ?? '?';
            return `${nameA} and ${nameB}`;
          }).join('; ')}. Flows in shared cells are counted in both.
          Reduce Ring size or space points further apart.
        </div>
      )}

      {points.length >= 2 && (
        <div style={{ marginTop: 12, fontWeight: 700, fontSize: 13, color: '#111827' }}>
          Total commuters: {totalCommuters.toLocaleString()}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, padding: '1px 4px', color: '#374151',
};
