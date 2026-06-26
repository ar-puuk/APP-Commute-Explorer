import { useEffect, useRef } from 'react';
import { cellToGeoJSONPolygon } from '../utils/h3Utils.js';

const SOURCE_ID = 'hex-clusters';
const FILL_ID   = 'hex-clusters-fill';
const LINE_ID   = 'hex-clusters-line';

export default function HexLayer({ map, points }) {
  const addedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const init = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: emptyFC() });
        map.addLayer({
          id: FILL_ID, type: 'fill', source: SOURCE_ID,
          paint: { 'fill-color': ['get', 'pointColor'], 'fill-opacity': 0.35 },
        });
        map.addLayer({
          id: LINE_ID, type: 'line', source: SOURCE_ID,
          paint: { 'line-color': ['get', 'pointColor'], 'line-width': 1, 'line-opacity': 0.7 },
        });
        addedRef.current = true;
      }
    };

    if (map.isStyleLoaded()) {
      init();
    } else {
      map.once('style.load', init);
    }
  }, [map]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const src = map.getSource(SOURCE_ID);
    if (!src) return;
    src.setData(buildFC(points));
  }, [map, points]);

  return null;
}

function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

function buildFC(points) {
  const features = [];
  for (const p of points) {
    for (const h3Id of p.clusterIds) {
      const f = cellToGeoJSONPolygon(h3Id);
      f.properties.pointColor = p.color;
      f.properties.pointId    = p.id;
      f.properties.pointName  = p.name;
      f.properties.countyName = p.countyName;
      features.push(f);
    }
  }
  return { type: 'FeatureCollection', features };
}
