import { useState, useRef, useEffect } from 'react';
import { PencilIcon, TrashIcon, WarningIcon } from './Icons.jsx';

const MAX_NAME_LEN = 40;

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

const GripIcon = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="2.5"  r="1.2"/><circle cx="8" cy="2.5"  r="1.2"/>
    <circle cx="4" cy="7"    r="1.2"/><circle cx="8" cy="7"    r="1.2"/>
    <circle cx="4" cy="11.5" r="1.2"/><circle cx="8" cy="11.5" r="1.2"/>
  </svg>
);

export default function PointCard({
  point, index, total,
  onDelete, onRename, onReorder, setPointColor,
  isNameDuplicate, overlapNames,
  outbound, inbound,
  isDragOver,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}) {
  const [editing,     setEditing]     = useState(false);
  const [editValue,   setEditValue]   = useState('');
  const [editError,   setEditError]   = useState('');
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [pickerPos,   setPickerPos]   = useState({ top: 0, left: 0 });
  const swatchRef = useRef(null);

  const openPicker = () => {
    if (swatchRef.current) {
      const r = swatchRef.current.getBoundingClientRect();
      const pickerH = 120;
      const top = (r.bottom + 6 + pickerH > window.innerHeight)
        ? r.top - pickerH - 6
        : r.bottom + 6;
      setPickerPos({ top, left: r.left });
    }
    setPickerOpen(true);
  };

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

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (swatchRef.current && !swatchRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isDragOver ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: isDragOver ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: '8px 10px',
        transition: 'background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
        opacity: isDragOver ? 0.85 : 1,
        cursor: 'default',
      }}
      onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
    >
      {/* Top row: grip + swatch + index + name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Drag handle */}
        <span
          style={{
            color: 'var(--color-text-muted)',
            cursor: 'grab',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '0 2px',
          }}
          title="Drag to reorder"
        >
          <GripIcon />
        </span>

        {/* Color swatch — clickable to open picker */}
        <div ref={swatchRef} style={{ position: 'relative', flexShrink: 0 }}>
          <span
            onClick={() => pickerOpen ? setPickerOpen(false) : openPicker()}
            title="Change zone color"
            style={{ display: 'inline-block', width: 15, height: 15, borderRadius: 'var(--radius-sm)', background: point.color, border: '1.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', flexShrink: 0 }}
          />
          {/* Color picker popover — fixed-positioned to escape overflow clipping */}
          {pickerOpen && (
            <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 1000, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '10px 12px', boxShadow: 'var(--shadow-md)', width: 168 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Zone Color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                {['#4e79a7','#f28e2b','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#e15759','#499894'].map(c => (
                  <div
                    key={c}
                    onClick={() => { setPointColor && setPointColor(point.id, c); setPickerOpen(false); }}
                    style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: c === point.color ? '2px solid #fff' : '2px solid transparent', transition: 'transform 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Index */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', minWidth: 14 }}>
          {index + 1}
        </span>

        {/* Name / edit input */}
        {editing ? (
          <input
            autoFocus
            value={editValue}
            maxLength={MAX_NAME_LEN}
            onChange={e => { setEditValue(e.target.value); setEditError(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            style={{
              flex: 1,
              minWidth: 0,
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
            disabled={index === 0}
            className="btn-icon"
            style={{ width: 24, height: 24, opacity: index === 0 ? 0.3 : 1 }}
          >
            <UpIcon />
          </button>
          <button
            aria-label="Move down"
            onClick={() => onReorder(point.id, 'down')}
            disabled={index === total - 1}
            className="btn-icon"
            style={{ width: 24, height: 24, opacity: index === total - 1 ? 0.3 : 1 }}
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
          marginLeft: 38,
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}>
          {point.countyName}
        </div>
      )}

      {/* In / Out mini flow bars — only shown when flow data is available */}
      {!editing && (outbound > 0 || inbound > 0) && (
        <div style={{ marginTop: 7, marginLeft: 38, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(() => {
            const maxFlow = Math.max(outbound, inbound, 1);
            const net = inbound - outbound;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 12, flexShrink: 0 }}>→</span>
                  <div style={{ flex: 1, height: 3, background: 'var(--color-surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(outbound / maxFlow) * 100}%`, height: '100%', background: 'var(--color-brand-600)', borderRadius: 2, opacity: 0.85 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: "'DM Mono', monospace", minWidth: 42, textAlign: 'right' }}>
                    {outbound.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 12, flexShrink: 0 }}>←</span>
                  <div style={{ flex: 1, height: 3, background: 'var(--color-surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(inbound / maxFlow) * 100}%`, height: '100%', background: 'var(--color-teal)', borderRadius: 2, opacity: 0.85 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: "'DM Mono', monospace", minWidth: 42, textAlign: 'right' }}>
                    {inbound.toLocaleString()}
                  </span>
                </div>
                {(outbound > 0 || inbound > 0) && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: net >= 0 ? 'var(--color-teal)' : 'var(--color-error)', textAlign: 'right', marginTop: 1 }}>
                    {net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString()} net {net >= 0 ? 'inbound' : 'outbound'}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Edit error / character counter */}
      {editing && (
        <div style={{
          marginTop: 3,
          marginLeft: 38,
          fontSize: 12,
          color: editError
            ? 'var(--color-error)'
            : editValue.length >= MAX_NAME_LEN - 5
              ? 'var(--color-warning)'
              : 'var(--color-text-muted)',
        }}>
          {editError || `${editValue.length} / ${MAX_NAME_LEN}`}
        </div>
      )}

      {/* Overlap badges */}
      {!editing && overlapNames.length > 0 && (
        <div style={{
          marginTop: 3,
          marginLeft: 38,
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
