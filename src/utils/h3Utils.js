import { latLngToCell, gridDisk, cellToBoundary } from 'h3-js';

export const H3_RESOLUTION = 9;

export function latlngToCell(lat, lng) {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

export function getCluster(h3Id, k) {
  return gridDisk(h3Id, k);
}

// Returns GeoJSON-order [lng, lat] pairs (pass true to h3-js cellToBoundary)
export function cellToGeoJSONPolygon(h3Id) {
  const coords = cellToBoundary(h3Id, true);
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: { h3Id },
  };
}
