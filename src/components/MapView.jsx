import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildMergedAGRCStyle } from '../utils/agrcStyle.js';
import { latlngToCell, getCluster, cellToGeoJSONPolygon } from '../utils/h3Utils.js';
import { getHexMeta } from '../utils/countyConfig.js';
import HexLayer from './HexLayer.jsx';
import FlowLayer from './FlowLayer.jsx';

const FALLBACK_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function MapView({
  points, kRing, activeView,
  onAddPoint,
  matrixCells,
  allClaimedHexIds,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const [map, setMap] = useState(null);
  const [hoveredHex, setHoveredHex] = useState(null);
  const [hoveredPos,  setHoveredPos]  = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    async function initMap() {
      let style;
      try {
        style = await buildMergedAGRCStyle();
      } catch {
        style = FALLBACK_STYLE;
      }

      const m = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-111.89, 40.76],
        zoom: 9,
        maxBounds: [[-115, 36.5], [-108, 43]],
      });

      m.addControl(new maplibregl.NavigationControl(), 'top-right');
      m.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-right');

      m.on('load', () => {
        mapRef.current = m;
        setMap(m);
      });

      m.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        const rootH3 = latlngToCell(lat, lng);
        const meta   = getHexMeta(rootH3);

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
    }

    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kRingRef = useRef(kRing);
  useEffect(() => { kRingRef.current = kRing; }, [kRing]);

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
      {map && activeView === 'map' && <FlowLayer map={map} points={points} matrixCells={matrixCells} />}

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
