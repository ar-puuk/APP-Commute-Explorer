import * as arrow from 'apache-arrow';

let hexMetaMap = null;

export async function loadHexMeta() {
  if (hexMetaMap) return hexMetaMap;

  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const res = await fetch(`${base}data/hex_meta.parquet`);
  if (!res.ok) throw new Error(`Failed to load hex_meta.parquet: ${res.status}`);

  const buf = await res.arrayBuffer();
  const table = arrow.tableFromIPC(new Uint8Array(buf));

  hexMetaMap = new Map();
  for (let i = 0; i < table.numRows; i++) {
    const h3_id      = table.getChild('h3_id').get(i);
    const lon        = table.getChild('lon').get(i);
    const lat        = table.getChild('lat').get(i);
    const county_fips = table.getChild('county_fips').get(i);
    const county_name = table.getChild('county_name').get(i);
    hexMetaMap.set(h3_id, { lon, lat, county_fips, county_name });
  }

  return hexMetaMap;
}

export function getHexMeta(h3Id) {
  return hexMetaMap?.get(h3Id) ?? null;
}

export function getAllHexMeta() {
  return hexMetaMap;
}
