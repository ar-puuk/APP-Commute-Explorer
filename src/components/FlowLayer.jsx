import { useEffect, useRef } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { FlowmapLayer } from '@flowmap.gl/layers';

const SHARED_PROPS = {
  flowLinesRenderingMode: 'straight',
  clusteringEnabled:      false,
  locationTotalsEnabled:  true,
  locationLabelsEnabled:  false,
  adaptiveScalesEnabled:  true,
  fadeEnabled:            true,
  darkMode:               false,
  colorScheme:            'GnBu',
  flowLineThicknessScale: 1.5,
  pickable:               true,
};

export default function FlowLayer({
  map, appMode,
  points, matrixCells,
  overviewLocations, overviewFlows,
}) {
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!overlayRef.current) {
      overlayRef.current = new MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlayRef.current);
    }

    if (!tooltipRef.current) {
      const el = document.createElement('div');
      el.style.cssText = [
        'position:fixed', 'z-index:9999', 'background:#fff', 'border:1px solid #d1d5db',
        'border-radius:8px', 'padding:10px 14px', 'box-shadow:0 4px 16px rgba(0,0,0,.15)',
        'font-size:12px', 'min-width:220px', 'pointer-events:none', 'display:none',
      ].join(';');
      document.body.appendChild(el);
      tooltipRef.current = el;
    }

    return () => {
      tooltipRef.current?.remove();
      tooltipRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!overlayRef.current) return;

    const showTooltip = (info, html) => {
      if (!tooltipRef.current) return;
      const rect = map.getContainer().getBoundingClientRect();
      const el = tooltipRef.current;
      el.innerHTML = html;
      el.style.display = 'block';
      el.style.left = `${rect.left + info.x + 12}px`;
      el.style.top  = `${rect.top  + info.y - 12}px`;
    };
    const hideTooltip = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };

    // ── Overview mode: full-region clustered view ──────────────────────────────
    if (appMode === 'overview') {
      if (!overviewLocations?.length || !overviewFlows?.length) {
        overlayRef.current.setProps({ layers: [] });
        return;
      }

      const layer = new FlowmapLayer({
        id: 'commute-flows-overview',
        data: { locations: overviewLocations, flows: overviewFlows },
        getLocationId:    loc  => loc.id,
        getLocationLat:   loc  => loc.lat,
        getLocationLon:   loc  => loc.lon,
        getLocationName:  loc  => loc.name,
        getFlowOriginId:  flow => flow.origin,
        getFlowDestId:    flow => flow.dest,
        getFlowMagnitude: flow => flow.count,
        ...SHARED_PROPS,
        clusteringEnabled: true,
        maxTopFlowsDisplayNum: 150,
        onHover: (info) => {
          const obj = info?.object;
          if (!obj || !info.picked) { hideTooltip(); return; }
          if (obj.type === 'flow') {
            const o = obj.origin?.name ?? '?';
            const d = obj.dest?.name   ?? '?';
            showTooltip(info, `
              <div style="font-weight:700">${o} → ${d}</div>
              <div style="margin-top:4px">Commuters: ${obj.count?.toLocaleString() ?? '?'}</div>
            `);
          } else if (obj.type === 'location') {
            showTooltip(info, `
              <div style="font-weight:700">${obj.name ?? '?'}</div>
            `);
          } else {
            hideTooltip();
          }
        },
      });

      overlayRef.current.setProps({ layers: [layer] });
      return;
    }

    // ── Select mode: user-defined points ──────────────────────────────────────
    if (points.length < 2) {
      overlayRef.current.setProps({ layers: [] });
      return;
    }

    const locMap = new Map();
    points.forEach(p => {
      locMap.set(p.id, { id: p.id, lat: p.lat, lon: p.lng, name: p.name });
    });

    const flowData = [];
    for (const [, cell] of matrixCells) {
      if (cell.S000 > 0) {
        flowData.push({ origin: cell.originPointId, dest: cell.destPointId, count: cell.S000, cell });
      }
    }

    const pctStr = (n, total) => total ? ` ${Math.round(n / total * 100)}%` : '';

    const layer = new FlowmapLayer({
      id: 'commute-flows-select',
      data: {
        locations: Array.from(locMap.values()),
        flows: flowData,
      },
      getLocationId:    loc  => loc.id,
      getLocationLat:   loc  => loc.lat,
      getLocationLon:   loc  => loc.lon,
      getLocationName:  loc  => loc.name,
      getFlowOriginId:  flow => flow.origin,
      getFlowDestId:    flow => flow.dest,
      getFlowMagnitude: flow => flow.count,
      ...SHARED_PROPS,
      onHover: (info) => {
        const obj = info?.object;
        if (!obj || !info.picked) { hideTooltip(); return; }

        if (obj.type === 'flow') {
          const { cell } = obj;
          if (!cell) { hideTooltip(); return; }
          const S = cell.S000;
          const oName = points.find(p => p.id === cell.originPointId)?.name ?? '?';
          const dName = points.find(p => p.id === cell.destPointId)?.name   ?? '?';
          showTooltip(info, `
            <div style="font-weight:700;margin-bottom:6px">${oName} → ${dName}</div>
            <div style="border-top:1px solid #e5e7eb;padding-top:6px">
              <div style="font-weight:700">Total commuters: ${S.toLocaleString()}</div>
              <div>Low wage (SA01): ${cell.SA01.toLocaleString()}${pctStr(cell.SA01, S)}</div>
              <div>Mid wage (SA02): ${cell.SA02.toLocaleString()}${pctStr(cell.SA02, S)}</div>
              <div>High wage (SA03): ${cell.SA03.toLocaleString()}${pctStr(cell.SA03, S)}</div>
            </div>
            <div style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px">
              <div>Goods-producing (SI01): ${cell.SI01.toLocaleString()}${pctStr(cell.SI01, S)}</div>
              <div>Trade/transport (SI02):  ${cell.SI02.toLocaleString()}${pctStr(cell.SI02, S)}</div>
              <div>Other services (SI03):   ${cell.SI03.toLocaleString()}${pctStr(cell.SI03, S)}</div>
              <div style="font-size:10px;color:#9ca3af;margin-top:4px">ⓘ Industry reflects job type at destination</div>
            </div>
          `);
        } else if (obj.type === 'location') {
          const p = points.find(pt => pt.id === (obj.location?.id ?? obj.id));
          if (!p) { hideTooltip(); return; }
          const inbound  = [...matrixCells.values()].filter(c => c.destPointId   === p.id).reduce((s, c) => s + c.S000, 0);
          const outbound = [...matrixCells.values()].filter(c => c.originPointId === p.id).reduce((s, c) => s + c.S000, 0);
          showTooltip(info, `
            <div style="font-weight:700">${p.name} — ${p.countyName}</div>
            <div>Outbound (as origin): ${outbound.toLocaleString()}</div>
            <div>Inbound (as dest): ${inbound.toLocaleString()}</div>
          `);
        } else {
          hideTooltip();
        }
      },
    });

    overlayRef.current.setProps({ layers: [layer] });
  }, [map, appMode, points, matrixCells, overviewLocations, overviewFlows]);

  return null;
}
