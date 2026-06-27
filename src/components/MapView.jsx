import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildBasemapStyle, addHillshadeToMap } from '../utils/agrcStyle.js';
import { latlngToCell, getCluster } from '../utils/h3Utils.js';
import { getHexMeta } from '../utils/countyConfig.js';
import { useTheme } from '../contexts/ThemeContext.jsx';
import HexLayer   from './HexLayer.jsx';
import FlowLayer  from './FlowLayer.jsx';
import FlowLegend from './FlowLegend.jsx';
import { HexTooltip } from './FlowTooltip.jsx';

export default function MapView({
  appMode, points, kRing, activeView,
  onAddPoint,
  onEnterSelect,
  matrixCells,
  allClaimedHexIds,
  overviewLocations,
  overviewFlows,
  year,
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const deckClickedRef  = useRef(false);
  const [map, setMap] = useState(null);
  const [hoveredHex, setHoveredHex] = useState(null);
  const [hoveredPos,  setHoveredPos]  = useState({ x: 0, y: 0 });

  const { resolvedTheme } = useTheme();
  const resolvedThemeRef  = useRef(resolvedTheme);
  useEffect(() => { resolvedThemeRef.current = resolvedTheme; }, [resolvedTheme]);

  // Overview uses overviewFlows directly (already has count); select uses matrixCells
  const legendFlows = appMode === 'overview'
    ? (overviewFlows ?? [])
    : [...(matrixCells?.values() ?? [])].map(c => ({ count: c.S000 }));

  /* ── addCustomLayers: county overlay + any post-style-load logic ── */
  function addCustomLayers(m) {
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
    fetch(`${base}data/counties.geojson`)
      .then(r => r.json())
      .then(geojson => {
        if (!m.getSource('county-overlay')) {
          m.addSource('county-overlay', { type: 'geojson', data: geojson });
        }
        if (!m.getLayer('county-mask')) {
          m.addLayer({
            id: 'county-mask',
            type: 'fill',
            source: 'county-overlay',
            filter: ['==', ['get', 'kind'], 'mask'],
            paint: { 'fill-color': '#1e293b', 'fill-opacity': 0.12 },
          });
        }
        if (!m.getLayer('county-boundary')) {
          m.addLayer({
            id: 'county-boundary',
            type: 'line',
            source: 'county-overlay',
            filter: ['==', ['get', 'kind'], 'boundary'],
            paint: { 'line-color': '#64748b', 'line-width': 1.5, 'line-dasharray': [3, 2] },
          });
        }
      })
      .catch(err => console.warn('[CountyOverlay] failed to load:', err.message));
  }

  /* ── Initial map setup ── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let cancelled = false;
    let idleWatchdog = null;
    const tileStats = {};
    const trackTile = (sourceId, outcome) => {
      if (!tileStats[sourceId]) tileStats[sourceId] = { ok: 0, err: 0, first: null };
      tileStats[sourceId][outcome]++;
    };

    async function initMap() {
      const style = await buildBasemapStyle(resolvedThemeRef.current);
      if (cancelled) return;

      const m = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-111.89, 40.76],
        zoom: 9,
        maxBounds: [[-115, 36.5], [-108, 43]],
        transformRequest: (url, resourceType) => {
          if (resourceType === 'Tile') {
            const srcId = url.includes('LiteBase')       ? 'litebase'
                        : url.includes('LiteLabels')     ? 'litelabels'
                        : url.includes('VectorHillshade') ? 'hillshade'
                        : 'unknown';
            if (!tileStats[srcId]) tileStats[srcId] = { ok: 0, err: 0, first: null };
            if (!tileStats[srcId].first) {
              tileStats[srcId].first = url;
              console.debug(`[MapTile] First tile for "${srcId}": ${url}`);
            }
          }
          return { url };
        },
      });

      m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      m.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), 'top-right');
      m.addControl(new maplibregl.FullscreenControl(), 'top-right');
      m.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

      m.on('load', () => {
        if (cancelled) { m.remove(); return; }
        mapRef.current = m;
        setMap(m);

        const styleObj = m.getStyle();
        console.log('[MapLoad] fired — sources:', Object.keys(styleObj.sources ?? {}).join(', '));
        console.log('[MapLoad] total layers:', styleObj.layers.length);

        addCustomLayers(m);
      });

      m.on('styleimagemissing', (e) => {
        m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });

      m.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId) {
          console.log(`[MapSource] "${e.sourceId}" fully loaded`);
        }
      });

      idleWatchdog = setTimeout(() => {
        console.warn('[MapIdle] Not idle after 10 s — map.loaded():', m.loaded());
      }, 10_000);

      m.once('idle', () => {
        clearTimeout(idleWatchdog);
        if (cancelled) return;
        addHillshadeToMap(m, resolvedThemeRef.current).catch((err) =>
          console.warn('[MapIdle] hillshade failed:', err)
        );
      });

      m.on('click', (e) => {
        // FlowLayer sets this flag when deck.gl consumes the click (arc/node tooltip dock).
        // Both fire on the same pointer event; checking the flag prevents a ghost point.
        if (deckClickedRef.current) { deckClickedRef.current = false; return; }
        if (modeRef.current !== 'select') return;
        const { lng, lat } = e.lngLat;
        const rootH3     = latlngToCell(lat, lng);
        const meta       = getHexMeta(rootH3);
        const clusterIds = getCluster(rootH3, kRingRef.current);
        const countyName = meta?.county_name ?? 'Unknown';
        onAddPoint({ lat, lng, rootH3, clusterIds, countyName });
      });

      m.on('mousemove', 'hex-clusters-fill', (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        setHoveredHex({
          pointName:  feat.properties.pointName,
          countyName: feat.properties.countyName,
          pointColor: feat.properties.pointColor,
        });
        setHoveredPos({ x: e.point.x + 14, y: e.point.y - 8 });
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'hex-clusters-fill', () => {
        setHoveredHex(null);
        m.getCanvas().style.cursor = '';
      });

      m.on('error', (e) => {
        const msg = e.error?.message ?? '';
        const src = e.sourceId ?? 'unknown';
        trackTile(src, 'err');
        if (msg.includes('Unimplemented type')) {
          console.debug(`[MapError] ${src} proto2 tile skipped`);
          return;
        }
        console.error(`[MapError] source="${src}" — ${msg}`, e.error);
      });
    }

    initMap();
    return () => {
      cancelled = true;
      clearTimeout(idleWatchdog);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Swap basemap when theme changes ── */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    buildBasemapStyle(resolvedTheme).then((styleUrl) => {
      // diff:false forces a full style reload so style.load always fires,
      // allowing HexLayer and county overlay to re-add their sources/layers.
      m.setStyle(styleUrl, { diff: false });
      m.once('style.load', () => {
        addCustomLayers(m);
        addHillshadeToMap(m, resolvedTheme).catch(() => {});
      });
    });
  }, [resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  const kRingRef = useRef(kRing);
  const modeRef  = useRef(appMode);
  useEffect(() => { kRingRef.current = kRing; },   [kRing]);
  useEffect(() => { modeRef.current  = appMode; }, [appMode]);

  /* ── Markers ── */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    points.forEach((p, idx) => {
      const el = document.createElement('div');
      el.style.cssText = [
        `width:24px`, `height:24px`, `border-radius:50%`,
        `background:${p.color}`, `border:2px solid #fff`,
        `box-shadow:0 2px 6px rgba(0,0,0,.4)`,
        `display:flex`, `align-items:center`, `justify-content:center`,
        `font-size:11px`, `font-weight:700`, `color:#fff`, `cursor:default`,
      ].join(';');
      el.textContent = String(idx + 1);

      const mk = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .addTo(m);
      markersRef.current.push(mk);
    });
  }, [points]);

  /* ── Find the hovered point's color for the tooltip accent ── */
  const hoveredPoint = hoveredHex
    ? points.find(p => p.name === hoveredHex.pointName)
    : null;

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {map && <HexLayer map={map} points={points} />}
      {map && (appMode === 'overview' || activeView === 'map') && (
        <FlowLayer
          map={map}
          appMode={appMode}
          points={points}
          matrixCells={matrixCells}
          overviewLocations={overviewLocations}
          overviewFlows={overviewFlows}
          deckClickedRef={deckClickedRef}
        />
      )}

      {/* Flow volume legend — shown in both overview and select modes */}
      <FlowLegend flows={legendFlows} />

      {/* Overview intro card */}
      {appMode === 'overview' && (
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 12,
          width: 320,
          padding: '16px 18px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Wasatch Front Commuter Flows
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
            LODES · {year} · 8 counties
          </div>
          <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: 14 }}>
            Click anywhere on the map to explore commuter flows between locations.
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={onEnterSelect}>
            Select Analysis Points →
          </button>
        </div>
      )}

      {/* Hex-cluster hover tooltip */}
      {hoveredHex && (
        <div style={{ position: 'absolute', left: hoveredPos.x, top: hoveredPos.y, pointerEvents: 'none', zIndex: 100 }}>
          <HexTooltip
            pointName={hoveredHex.pointName}
            countyName={hoveredHex.countyName}
            pointColor={hoveredPoint?.color}
            kRing={kRing}
          />
        </div>
      )}
    </div>
  );
}
