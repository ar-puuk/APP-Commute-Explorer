import { useState } from 'react';
import { PencilIcon, TrashIcon, WarningIcon } from './Icons.jsx';

const UpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PointCard({
  point, index,
  onDelete, onRename, onReorder,
  isNameDuplicate, overlapNames,
}) {
  const [editing,   setEditing]   = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');

  const startEdit = () => {
    setEditValue(point.name);
    setEditError('');
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed)                            { setEditError('Name cannot be empty'); return; }
    if (isNameDuplicate(trimmed, point.id))  { setEditError('Name already in use');  return; }
    onRename(point.id, trimmed);
    setEditing(false);
    setEditError('');
  };

  const cancelEdit = () => { setEditing(false); setEditError(''); };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '8px 10px',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
    >
      {/* Top row: swatch + index + name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Color swatch */}
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 'var(--radius-sm)',
            background: point.color,
            flexShrink: 0,
          }}
        />

        {/* Index */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', minWidth: 14 }}>
          {index + 1}
        </span>

        {/* Name / edit input */}
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={e => { setEditValue(e.target.value); setEditError(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--color-brand-600)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {point.name}
          </span>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <button
            aria-label="Move up"
            onClick={() => onReorder(point.id, 'up')}
            className="btn-icon"
            style={{ width: 24, height: 24 }}
          >
            <UpIcon />
          </button>
          <button
            aria-label="Move down"
            onClick={() => onReorder(point.id, 'down')}
            className="btn-icon"
            style={{ width: 24, height: 24 }}
          >
            <DownIcon />
          </button>
          <button
            aria-label={editing ? 'Save name' : 'Rename zone'}
            onClick={editing ? commitEdit : startEdit}
            className="btn-icon"
            style={{ width: 24, height: 24 }}
          >
            <PencilIcon size={13} />
          </button>
          <button
            aria-label="Delete zone"
            onClick={() => onDelete(point.id)}
            className="btn-icon"
            style={{ width: 24, height: 24, color: 'var(--color-error)' }}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      {/* County name */}
      {point.countyName && !editing && (
        <div style={{
          marginTop: 3,
          marginLeft: 34,
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}>
          {point.countyName}
        </div>
      )}

      {/* Edit error */}
      {editing && editError && (
        <div style={{
          marginTop: 3,
          marginLeft: 34,
          fontSize: 12,
          color: 'var(--color-error)',
        }}>
          {editError}
        </div>
      )}

      {/* Overlap badges */}
      {!editing && overlapNames.length > 0 && (
        <div style={{
          marginTop: 3,
          marginLeft: 34,
          fontSize: 12,
          color: 'var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <WarningIcon size={12} />
          <span>Overlaps with {overlapNames.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
