import { useEffect, useRef } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { FlowmapLayer } from '@flowmap.gl/layers';
import { buildFlowTooltipHTML, buildOverviewTooltipHTML } from './FlowTooltip.jsx';
import { SVG_UNPIN } from './Icons.jsx';

const BASE_PROPS = {
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
  const overlayRef  = useRef(null);
  const tooltipRef  = useRef(null);
  const closeRef    = useRef(null);   // separate × button rendered outside tooltip
  const dockedRef   = useRef(false);  // true = position locked to top-left corner
  const lastHtmlRef = useRef('');
  // Ref so the stable click listener on closeRef can always call the latest undock closure
  const undockFnRef = useRef(null);

  /* ── Create overlay + tooltip DOM element + close button once ── */
  useEffect(() => {
    if (!map) return;

    if (!overlayRef.current) {
      overlayRef.current = new MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlayRef.current);
    }

    if (!tooltipRef.current) {
      const el = document.createElement('div');
      el.className = 'flow-tooltip';
      // pointer-events:none — tooltip never blocks map interaction
      el.style.cssText = 'display:none;position:fixed;pointer-events:none;';
      map.getContainer().appendChild(el);
      tooltipRef.current = el;
    }

    if (!closeRef.current) {
      const btn = document.createElement('button');
      btn.className = 'tt-dock-close';
      btn.title = 'Undock (or click an arc again)';
      btn.innerHTML = SVG_UNPIN;
      // Append to body so z-index and click events are never blocked by the map overlay
      document.body.appendChild(btn);
      btn.addEventListener('click', () => undockFnRef.current?.());
      closeRef.current = btn;
    }

    return () => {
      tooltipRef.current?.remove();
      tooltipRef.current = null;
      closeRef.current?.remove();
      closeRef.current = null;
    };
  }, [map]);

  /* ── Rebuild FlowmapLayer whenever data changes ── */
  useEffect(() => {
    if (!overlayRef.current) return;

    // Legend is visible in select mode (≥2 points) and overview mode (flows loaded)
    const legendVisible =
      (appMode === 'select'   && points.length >= 2) ||
      (appMode === 'overview' && (overviewFlows?.length ?? 0) > 0);
    const DOCK_TOP = legendVisible ? 108 : 12;

    /* Position the tooltip at the docked corner and show the close button */
    const dockTooltip = () => {
      if (!tooltipRef.current || !lastHtmlRef.current) return;
      dockedRef.current = true;
      const rect = map.getContainer().getBoundingClientRect();
      const el = tooltipRef.current;
      // Prepend a small "DOCKED" label so the user knows the position is locked
      el.innerHTML = `<div class="tt-dock-label">Docked · hover arcs to update</div>${lastHtmlRef.current}`;
      el.style.display = 'block';
      el.style.left = `${rect.left + 12}px`;
      el.style.top  = `${rect.top + DOCK_TOP}px`;

      const btn = closeRef.current;
      if (btn) {
        // Position × at the top-right corner of the docked tooltip (tooltip is 260px wide)
        btn.style.display = 'inline-flex';
        btn.style.left = `${rect.left + 12 + 260 - 26}px`;
        btn.style.top  = `${rect.top + DOCK_TOP + 5}px`;
      }
    };

    const undockTooltip = () => {
      dockedRef.current = false;
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      if (closeRef.current)   closeRef.current.style.display = 'none';
    };

    // Keep ref current so the stable button listener always calls the latest closure
    undockFnRef.current = undockTooltip;

    const showTooltip = (info, html) => {
      lastHtmlRef.current = html;
      if (!tooltipRef.current) return;
      const el = tooltipRef.current;
      el.style.display = 'block';

      if (dockedRef.current) {
        // Update content but keep position locked
        el.innerHTML = `<div class="tt-dock-label">Docked · hover arcs to update</div>${html}`;
      } else {
        // Follow cursor
        el.innerHTML = html;
        const rect = map.getContainer().getBoundingClientRect();
        el.style.left = `${rect.left + info.x + 14}px`;
        el.style.top  = `${rect.top  + info.y - 8}px`;
      }
    };

    const hideTooltip = () => {
      if (dockedRef.current) return;   // docked tooltip stays visible
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };

    const handleClick = () => {
      if (dockedRef.current) {
        undockTooltip();
      } else if (lastHtmlRef.current) {
        dockTooltip();
      }
    };

    // ── Overview mode ────────────────────────────────────────────────────────
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
        ...BASE_PROPS,
        clusteringEnabled: true,
        maxTopFlowsDisplayNum: 150,
        onClick: handleClick,
        onHover: (info) => {
          const obj = info?.object;
          if (!obj || !info.picked) { hideTooltip(); return; }
          if (obj.type === 'flow') {
            showTooltip(info, buildOverviewTooltipHTML('arc', {
              count:      obj.count,
              originName: obj.origin?.name ?? '?',
              destName:   obj.dest?.name   ?? '?',
            }));
          } else if (obj.type === 'location') {
            const locId   = obj.id ?? obj.location?.id;
            const inbound  = (overviewFlows ?? []).filter(f => f.dest   === locId).reduce((s, f) => s + f.count, 0);
            const outbound = (overviewFlows ?? []).filter(f => f.origin === locId).reduce((s, f) => s + f.count, 0);
            showTooltip(info, buildOverviewTooltipHTML('location', {
              name: obj.name ?? '?',
              inbound,
              outbound,
            }));
          } else {
            hideTooltip();
          }
        },
      });

      overlayRef.current.setProps({ layers: [layer] });
      return;
    }

    // ── Select mode ──────────────────────────────────────────────────────────
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
      ...BASE_PROPS,
      onClick: handleClick,
      onHover: (info) => {
        const obj = info?.object;
        if (!obj || !info.picked) { hideTooltip(); return; }

        if (obj.type === 'flow') {
          // FlowmapLayer's hover object doesn't carry the original flow data —
          // look up the cell from matrixCells using the location IDs it does provide.
          const originId = obj.origin?.id;
          const destId   = obj.dest?.id;
          const cell     = originId && destId ? matrixCells.get(`${originId}|${destId}`) : null;
          if (!cell) { hideTooltip(); return; }
          const oPoint = points.find(p => p.id === originId);
          const dPoint = points.find(p => p.id === destId);
          showTooltip(info, buildFlowTooltipHTML('arc', {
            cell,
            originName:  oPoint?.name  ?? obj.origin?.name ?? '?',
            destName:    dPoint?.name  ?? obj.dest?.name   ?? '?',
            originColor: oPoint?.color ?? 'var(--color-brand-600)',
            destColor:   dPoint?.color ?? 'var(--color-text-muted)',
          }));
        } else if (obj.type === 'location') {
          const p = points.find(pt => pt.id === (obj.location?.id ?? obj.id));
          if (!p) { hideTooltip(); return; }
          const inbound  = [...matrixCells.values()].filter(c => c.destPointId   === p.id).reduce((s, c) => s + c.S000, 0);
          const outbound = [...matrixCells.values()].filter(c => c.originPointId === p.id).reduce((s, c) => s + c.S000, 0);
          showTooltip(info, buildFlowTooltipHTML('node', { point: p, inbound, outbound }));
        } else {
          hideTooltip();
        }
      },
    });

    overlayRef.current.setProps({ layers: [layer] });
  }, [map, appMode, points, matrixCells, overviewLocations, overviewFlows]);

  return null;
}
