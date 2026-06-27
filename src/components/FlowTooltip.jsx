import { useState } from 'react';
import { InfoIcon, ArrowRightIcon, ArrowLeftIcon, SVG_FLOW_ARROW, SVG_ARROW_RIGHT, SVG_ARROW_LEFT, SVG_INFO } from './Icons.jsx';

/* ─── MiniBar ────────────────────────────────────────────────────────────── */
function MiniBar({ pct, variant = 'wage' }) {
  return (
    <div className="flow-tooltip__bar-track">
      <div
        className={`flow-tooltip__bar-fill${variant === 'industry' ? ' flow-tooltip__bar-fill--industry' : ''}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function pct(num, total) {
  return total > 0 ? Math.round((num / total) * 100) : 0;
}

/* ─── FlowArcTooltip ─────────────────────────────────────────────────────── */
export function FlowArcTooltip({ cell, originName, destName, originColor, destColor }) {
  if (!cell || !cell.S000) return null;
  const S = cell.S000;

  const wages = [
    { label: 'Low (SA01)',  value: cell.SA01 },
    { label: 'Mid (SA02)',  value: cell.SA02 },
    { label: 'High (SA03)', value: cell.SA03 },
  ];
  const industries = [
    { label: 'Goods-producing', value: cell.SI01 },
    { label: 'Trade/transport', value: cell.SI02 },
    { label: 'Other services',  value: cell.SI03 },
  ];

  return (
    <div className="flow-tooltip">
      <div className="flow-tooltip__accent" />
      <div className="flow-tooltip__body">
        {/* Route headline */}
        <div className="flow-tooltip__route">
          <span
            className="flow-tooltip__dot"
            style={{ background: originColor || 'var(--color-brand-600)' }}
          />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{originName}</span>
          <span className="flow-tooltip__arrow" style={{ display: 'inline-flex', alignItems: 'center' }}><ArrowRightIcon size={13} /></span>
          <span
            className="flow-tooltip__dot"
            style={{ background: destColor || 'var(--color-text-muted)' }}
          />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{destName}</span>
        </div>

        {/* Commuter volume */}
        <div className="flow-tooltip__section">Commuter Volume</div>
        <div className="flow-tooltip__number">{S.toLocaleString()}</div>

        <div className="flow-tooltip__divider" />

        {/* Wages */}
        <div className="flow-tooltip__section">Wages</div>
        {wages.map(({ label, value }) => (
          <div key={label} className="flow-tooltip__row">
            <span className="flow-tooltip__row-label">{label}</span>
            <MiniBar pct={pct(value, S)} variant="wage" />
            <span className="flow-tooltip__row-count">{value.toLocaleString()}</span>
            <span className="flow-tooltip__row-pct">{pct(value, S)}%</span>
          </div>
        ))}

        <div className="flow-tooltip__divider" />

        {/* Industry */}
        <div className="flow-tooltip__section">Industry (at destination)</div>
        {industries.map(({ label, value }) => (
          <div key={label} className="flow-tooltip__row">
            <span className="flow-tooltip__row-label">{label}</span>
            <MiniBar pct={pct(value, S)} variant="industry" />
            <span className="flow-tooltip__row-count">{value.toLocaleString()}</span>
            <span className="flow-tooltip__row-pct">{pct(value, S)}%</span>
          </div>
        ))}

        <div className="flow-tooltip__caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <InfoIcon size={12} /> Industry reflects job type at destination
        </div>
      </div>
    </div>
  );
}

/* ─── LocationTooltip ────────────────────────────────────────────────────── */
export function LocationTooltip({ point, inbound, outbound }) {
  if (!point) return null;
  const maxFlow  = Math.max(inbound, outbound, 1);
  const net      = inbound - outbound;
  const netClass = net >= 0 ? 'flow-tooltip__net-positive' : 'flow-tooltip__net-negative';
  const netLabel = net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString();

  return (
    <div className="flow-tooltip">
      <div
        className="flow-tooltip__accent flow-tooltip__accent--point"
        style={{ background: point.color }}
      />
      <div className="flow-tooltip__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span
            className="flow-tooltip__swatch"
            style={{ background: point.color }}
          />
          <span className="flow-tooltip__name">{point.name}</span>
        </div>
        {point.countyName && (
          <div className="flow-tooltip__meta">{point.countyName}</div>
        )}

        <div className="flow-tooltip__divider" />
        <div className="flow-tooltip__section">Flows</div>

        <div className="flow-tooltip__row">
          <span className="flow-tooltip__row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowRightIcon size={12} /> Outbound</span>
          <MiniBar pct={(outbound / maxFlow) * 100} variant="wage" />
          <span className="flow-tooltip__row-count">{outbound.toLocaleString()}</span>
          <span className="flow-tooltip__row-pct" />
        </div>
        <div className="flow-tooltip__row">
          <span className="flow-tooltip__row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeftIcon size={12} /> Inbound</span>
          <MiniBar pct={(inbound / maxFlow) * 100} variant="industry" />
          <span className="flow-tooltip__row-count">{inbound.toLocaleString()}</span>
          <span className="flow-tooltip__row-pct" />
        </div>

        <div className="flow-tooltip__divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {net >= 0 ? 'Net inbound' : 'Net outbound'}
          </span>
          <span className={netClass}>{netLabel}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── HexTooltip ─────────────────────────────────────────────────────────── */
export function HexTooltip({ pointName, countyName, pointColor, kRing }) {
  return (
    <div className="flow-tooltip flow-tooltip--sm">
      <div
        className="flow-tooltip__accent flow-tooltip__accent--point"
        style={{ background: pointColor || 'var(--color-brand-600)' }}
      />
      <div className="flow-tooltip__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="flow-tooltip__swatch"
            style={{ background: pointColor || 'var(--color-brand-600)' }}
          />
          <span className="flow-tooltip__name" style={{ fontSize: 14 }}>{pointName}</span>
        </div>
        {countyName && (
          <div className="flow-tooltip__meta">{countyName}</div>
        )}
        {kRing !== undefined && (
          <div className="flow-tooltip__meta" style={{ marginTop: 4 }}>
            H3 res-9 · ring k = {kRing}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Positioned wrapper for ODMatrix ───────────────────────────────────── */
export function PositionedFlowTooltip({ cell, originName, destName, originColor, destColor, x, y }) {
  if (!cell || !cell.S000) return null;
  return (
    <div style={{ position: 'fixed', left: x, top: y, zIndex: 9999, pointerEvents: 'none' }}>
      <FlowArcTooltip
        cell={cell}
        originName={originName}
        destName={destName}
        originColor={originColor}
        destColor={destColor}
      />
    </div>
  );
}

/* ─── buildFlowTooltipHTML — for FlowLayer DOM tooltip ──────────────────── */
export function buildFlowTooltipHTML(type, data) {
  if (type === 'arc') {
    const { S000, SA01, SA02, SA03, SI01, SI02, SI03 } = data.cell;
    const p = (n) => S000 > 0 ? Math.round((n / S000) * 100) : 0;
    const bar = (pctVal, cls = '') =>
      `<div class="flow-tooltip__bar-track"><div class="flow-tooltip__bar-fill${cls}" style="width:${pctVal}%"></div></div>`;
    const row = (label, value, pctVal, barCls = '') =>
      `<div class="flow-tooltip__row">
        <span class="flow-tooltip__row-label">${label}</span>
        ${bar(pctVal, barCls)}
        <span class="flow-tooltip__row-count">${value.toLocaleString()}</span>
        <span class="flow-tooltip__row-pct">${pctVal}%</span>
      </div>`;

    return `
      <div class="flow-tooltip__accent"></div>
      <div class="flow-tooltip__body">
        <div class="flow-tooltip__route">
          <span class="flow-tooltip__dot" style="background:${data.originColor || '#2563eb'}"></span>
          <span style="font-weight:700">${data.originName}</span>
          <span class="flow-tooltip__arrow" style="display:inline-flex;align-items:center">${SVG_FLOW_ARROW}</span>
          <span class="flow-tooltip__dot" style="background:${data.destColor || '#94a3b8'}"></span>
          <span style="font-weight:700">${data.destName}</span>
        </div>
        <div class="flow-tooltip__section">Commuter Volume</div>
        <div class="flow-tooltip__number">${S000.toLocaleString()}</div>
        <div class="flow-tooltip__divider"></div>
        <div class="flow-tooltip__section">Wages</div>
        ${row('Low (SA01)',  SA01, p(SA01))}
        ${row('Mid (SA02)',  SA02, p(SA02))}
        ${row('High (SA03)', SA03, p(SA03))}
        <div class="flow-tooltip__divider"></div>
        <div class="flow-tooltip__section">Industry (at destination)</div>
        ${row('Goods-producing', SI01, p(SI01), ' flow-tooltip__bar-fill--industry')}
        ${row('Trade/transport', SI02, p(SI02), ' flow-tooltip__bar-fill--industry')}
        ${row('Other services',  SI03, p(SI03), ' flow-tooltip__bar-fill--industry')}
        <div class="flow-tooltip__caption" style="display:flex;align-items:center;gap:4px">${SVG_INFO} Industry reflects job type at destination</div>
      </div>`;
  }

  if (type === 'node') {
    const { point, inbound, outbound } = data;
    const maxFlow  = Math.max(inbound, outbound, 1);
    const net      = inbound - outbound;
    const netLabel = net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString();
    const netClass = net >= 0 ? 'flow-tooltip__net-positive' : 'flow-tooltip__net-negative';
    const bar      = (pctVal, cls = '') =>
      `<div class="flow-tooltip__bar-track"><div class="flow-tooltip__bar-fill${cls}" style="width:${pctVal}%"></div></div>`;

    return `
      <div class="flow-tooltip__accent flow-tooltip__accent--point" style="background:${point.color}"></div>
      <div class="flow-tooltip__body">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
          <span class="flow-tooltip__swatch" style="background:${point.color}"></span>
          <span class="flow-tooltip__name">${point.name}</span>
        </div>
        ${point.countyName ? `<div class="flow-tooltip__meta">${point.countyName}</div>` : ''}
        <div class="flow-tooltip__divider"></div>
        <div class="flow-tooltip__section">Flows</div>
        <div class="flow-tooltip__row">
          <span class="flow-tooltip__row-label" style="display:inline-flex;align-items:center;gap:4px">${SVG_ARROW_RIGHT} Outbound</span>
          ${bar(Math.round((outbound / maxFlow) * 100))}
          <span class="flow-tooltip__row-count">${outbound.toLocaleString()}</span>
          <span class="flow-tooltip__row-pct"></span>
        </div>
        <div class="flow-tooltip__row">
          <span class="flow-tooltip__row-label" style="display:inline-flex;align-items:center;gap:4px">${SVG_ARROW_LEFT} Inbound</span>
          ${bar(Math.round((inbound / maxFlow) * 100), ' flow-tooltip__bar-fill--industry')}
          <span class="flow-tooltip__row-count">${inbound.toLocaleString()}</span>
          <span class="flow-tooltip__row-pct"></span>
        </div>
        <div class="flow-tooltip__divider"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:var(--color-text-secondary)">${net >= 0 ? 'Net inbound' : 'Net outbound'}</span>
          <span class="${netClass}">${netLabel}</span>
        </div>
      </div>`;
  }

  return '';
}

/* ─── buildOverviewTooltipHTML — lightweight tooltips for overview mode ─────── */
export function buildOverviewTooltipHTML(type, data) {
  if (type === 'arc') {
    const { count, originName, destName } = data;
    return `
      <div class="flow-tooltip__accent"></div>
      <div class="flow-tooltip__body">
        <div class="flow-tooltip__route">
          <span class="flow-tooltip__dot" style="background:var(--color-brand-600)"></span>
          <span style="font-weight:700">${originName}</span>
          <span class="flow-tooltip__arrow" style="display:inline-flex;align-items:center">${SVG_FLOW_ARROW}</span>
          <span class="flow-tooltip__dot" style="background:var(--color-text-muted)"></span>
          <span style="font-weight:700">${destName}</span>
        </div>
        <div class="flow-tooltip__section">Commuter Volume</div>
        <div class="flow-tooltip__number">${count.toLocaleString()}</div>
        <div class="flow-tooltip__caption" style="display:flex;align-items:center;gap:4px">${SVG_INFO} Regional aggregate · LODES data</div>
      </div>`;
  }

  if (type === 'location') {
    const { name, inbound, outbound } = data;
    const maxFlow  = Math.max(inbound, outbound, 1);
    const net      = inbound - outbound;
    const netLabel = net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString();
    const netClass = net >= 0 ? 'flow-tooltip__net-positive' : 'flow-tooltip__net-negative';
    const bar      = (pct, cls = '') =>
      `<div class="flow-tooltip__bar-track"><div class="flow-tooltip__bar-fill${cls}" style="width:${pct}%"></div></div>`;

    return `
      <div class="flow-tooltip__accent"></div>
      <div class="flow-tooltip__body">
        <span class="flow-tooltip__name">${name}</span>
        <div class="flow-tooltip__divider"></div>
        <div class="flow-tooltip__section">Flows</div>
        <div class="flow-tooltip__row">
          <span class="flow-tooltip__row-label" style="display:inline-flex;align-items:center;gap:4px">${SVG_ARROW_RIGHT} Outbound</span>
          ${bar(Math.round((outbound / maxFlow) * 100))}
          <span class="flow-tooltip__row-count">${outbound.toLocaleString()}</span>
          <span class="flow-tooltip__row-pct"></span>
        </div>
        <div class="flow-tooltip__row">
          <span class="flow-tooltip__row-label" style="display:inline-flex;align-items:center;gap:4px">${SVG_ARROW_LEFT} Inbound</span>
          ${bar(Math.round((inbound / maxFlow) * 100), ' flow-tooltip__bar-fill--industry')}
          <span class="flow-tooltip__row-count">${inbound.toLocaleString()}</span>
          <span class="flow-tooltip__row-pct"></span>
        </div>
        <div class="flow-tooltip__divider"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:var(--color-text-secondary)">${net >= 0 ? 'Net inbound' : 'Net outbound'}</span>
          <span class="${netClass}">${netLabel}</span>
        </div>
      </div>`;
  }

  return '';
}

/* ─── ODMatrix cell tooltip hook helper ─────────────────────────────────── */
export function useMatrixTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const [pos, setPos]         = useState({ x: 0, y: 0 });

  const show = (e, cell, originName, destName, originColor, destColor) => {
    setTooltip({ cell, originName, destName, originColor, destColor });
    setPos({ x: e.clientX + 14, y: e.clientY - 8 });
  };
  const move  = (e) => setPos({ x: e.clientX + 14, y: e.clientY - 8 });
  const hide  = ()  => setTooltip(null);

  const element = tooltip ? (
    <PositionedFlowTooltip {...tooltip} x={pos.x} y={pos.y} />
  ) : null;

  return { show, move, hide, element };
}
