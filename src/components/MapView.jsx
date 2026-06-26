import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildBasemapStyle, addHillshadeToMap } from '../utils/agrcStyle.js';
import { latlngToCell, getCluster } from '../utils/h3Utils.js';
import { getHexMeta } from '../utils/countyConfig.js';
import HexLayer from './HexLayer.jsx';
import FlowLayer from './FlowLayer.jsx';

export default function MapView({
  appMode, points, kRing, activeView,
  onAddPoint,
  matrixCells,
  allClaimedHexIds,
  overviewLocations,
  overviewFlows,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const [map, setMap] = useState(null);
  const [hoveredHex, setHoveredHex] = useState(null);
  const [hoveredPos,  setHoveredPos]  = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let cancelled = false;
    let idleWatchdog = null;

    async function initMap() {
      const style = await buildBasemapStyle();
      if (cancelled) return;

      // Per-source tile counters for debug reporting
      const tileStats = {};
      const trackTile = (sourceId, outcome) => {
        if (!tileStats[sourceId]) tileStats[sourceId] = { ok: 0, err: 0, first: null };
        tileStats[sourceId][outcome]++;
      };

      const m = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-111.89, 40.76],
        zoom: 9,
        maxBounds: [[-115, 36.5], [-108, 43]],
        // Log every outgoing tile/resource request so we can see the actual URLs
        transformRequest: (url, resourceType) => {
          if (resourceType === 'Tile') {
            const srcId = Object.keys(tileStats).find(k => url.includes(k.replace('_esri', '')))
              ?? (url.includes('LiteBase')       ? 'litebase'
                : url.includes('LiteLabels')     ? 'litelabels'
                : url.includes('VectorHillshade') ? 'hillshade'
                : 'unknown');
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

        // Log every source so we can spot wrong tile URLs or bounds
        const styleObj = m.getStyle();
        console.log('[MapLoad] fired — sources:');
        for (const [id, src] of Object.entries(styleObj.sources ?? {})) {
          const layerCount = styleObj.layers.filter(l => l.source === id).length;
          console.log(`  "${id}" ${layerCount} layers | tile: ${src.tiles?.[0] ?? src.url} | zoom ${src.minzoom}–${src.maxzoom} | bounds: ${JSON.stringify(src.bounds ?? 'world')}`);
        }
        console.log('[MapLoad] total layers:', styleObj.layers.length, '| sprite:', styleObj.sprite, '| glyphs:', styleObj.glyphs);

        // County boundary overlay — dims everything outside the data area
        const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
        fetch(`${base}data/counties.geojson`)
          .then(r => r.json())
          .then(geojson => {
            if (cancelled) return;
            m.addSource('county-overlay', { type: 'geojson', data: geojson });
            m.addLayer({
              id: 'county-mask',
              type: 'fill',
              source: 'county-overlay',
              filter: ['==', ['get', 'kind'], 'mask'],
              paint: { 'fill-color': '#1e293b', 'fill-opacity': 0.12 },
            });
            m.addLayer({
              id: 'county-boundary',
              type: 'line',
              source: 'county-overlay',
              filter: ['==', ['get', 'kind'], 'boundary'],
              paint: { 'line-color': '#64748b', 'line-width': 1.5, 'line-dasharray': [3, 2] },
            });
          })
          .catch(err => console.warn('[CountyOverlay] failed to load:', err.message));
      });

      // VectorHillshade layers may reference sprites not in the basemap's sheet.
      // Add a 1×1 transparent placeholder so the layer still renders without the icon.
      m.on('styleimagemissing', (e) => {
        console.warn(`[MapSprite] Missing icon "${e.id}" — adding transparent placeholder`);
        m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });

      // Track which sources finish loading all currently-visible tiles
      m.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId) {
          console.log(`[MapSource] "${e.sourceId}" fully loaded`);
        }
      });

      // Watchdog: if idle hasn't fired in 10 s the map is stalled (likely proto2
      // tile retries keeping litebase perpetually non-idle).
      idleWatchdog = setTimeout(() => {
        console.warn('[MapIdle] Not idle after 10 s — map.loaded():', m.loaded(),
          '| areTilesLoaded():', m.areTilesLoaded());
      }, 10_000);

      // Add hillshade after basemap tiles settle so it doesn't compete for
      // bandwidth during initial load.
      m.once('idle', () => {
        clearTimeout(idleWatchdog);
        if (cancelled) return;
        console.log('[MapIdle] Basemap idle — adding hillshade now');
        addHillshadeToMap(m).catch((err) => console.warn('[MapIdle] hillshade failed:', err));
      });

      m.on('click', (e) => {
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
        setHoveredHex({ pointName: feat.properties.pointName, countyName: feat.properties.countyName });
        setHoveredPos({ x: e.point.x + 12, y: e.point.y - 12 });
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
        // VectorHillshade tiles use proto2 group encoding — MapLibre skips them silently
        if (msg.includes('Unimplemented type')) {
          console.debug(`[MapError] ${src} proto2 tile skipped`);
          return;
        }
        console.error(`[MapError] source="${src}" tile="${e.tile?.tileID?.canonical ?? ''}" — ${msg}`, e.error);
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

  const kRingRef  = useRef(kRing);
  const modeRef   = useRef(appMode);
  useEffect(() => { kRingRef.current = kRing; },    [kRing]);
  useEffect(() => { modeRef.current  = appMode; },  [appMode]);

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
        />
      )}

      {hoveredHex && (
        <div style={{
          position: 'absolute', left: hoveredPos.x, top: hoveredPos.y,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          padding: '6px 10px', fontSize: 12, pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,.15)', zIndex: 100,
        }}>
          <strong>{hoveredHex.pointName}</strong>
          {hoveredHex.countyName && <div style={{ color: '#6b7280' }}>{hoveredHex.countyName}</div>}
        </div>
      )}
    </div>
  );
}
