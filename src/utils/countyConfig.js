import { cellToParent } from 'h3-js';
import { initDB, query } from '../hooks/useDuckDB.js';

// Resolution 5 cells are ~253 km² — large enough to guarantee at least one census
// block centroid even in sparse rural areas (Tooele salt flats, mountain wilderness).
const COARSE_RES = 5;

let hexMetaMap    = null;  // res-9 h3_id → { lon, lat, county_fips, county_name }
let coarseCountyMap = null; // res-5 parent → county_name (first-seen plurality)

export async function loadHexMeta() {
  if (hexMetaMap) return hexMetaMap;

  await initDB();

  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const url  = `${base}data/hex_meta.parquet`;

  const table = await query(
    `SELECT h3_id, lon, lat, county_fips, county_name FROM parquet_scan('${url}')`
  );

  hexMetaMap    = new Map();
  coarseCountyMap = new Map();

  for (const row of table.toArray()) {
    const h3_id      = String(row.h3_id);
    const county_name = String(row.county_name);
    hexMetaMap.set(h3_id, {
      lon:         Number(row.lon),
      lat:         Number(row.lat),
      county_fips: String(row.county_fips),
      county_name,
    });
    const parent = cellToParent(h3_id, COARSE_RES);
    if (!coarseCountyMap.has(parent)) coarseCountyMap.set(parent, county_name);
  }

  return hexMetaMap;
}

export function lookupCountyName(h3Id) {
  if (!hexMetaMap) return null;
  const exact = hexMetaMap.get(h3Id);
  if (exact) return exact.county_name;
  return coarseCountyMap.get(cellToParent(h3Id, COARSE_RES)) ?? null;
}

export function getHexMeta(h3Id) {
  return hexMetaMap?.get(h3Id) ?? null;
}

export function getAllHexMeta() {
  return hexMetaMap;
}
