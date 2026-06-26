// Set to true to use UGRC Vector LiteBase + LiteLabels + VectorHillshade.
// Requires the Service Worker (public/sw.js) to rewrite proto2 ArcGIS tiles.
// When false, Carto Positron is used — works anywhere without API keys.
const USE_UGRC_BASEMAP = false;

const AGRC_BASE = 'https://tiles.arcgis.com/tiles/99lidPhWCzftIe9K/arcgis/rest/services';

const CARTO_POSITRON  = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const STYLE_CACHE_KEY = 'agrc_basemap_style_v8';
const CACHE_TTL_MS    = 24 * 60 * 60 * 1000; // 24 h

// Purge any stale versioned cache entries from localStorage on module load.
try {
  Object.keys(localStorage)
    .filter(k => k.startsWith('agrc_basemap_style_') && k !== STYLE_CACHE_KEY)
    .forEach(k => localStorage.removeItem(k));
} catch {}

// Resolve relative URL paths without percent-encoding curly braces.
// new URL() encodes { } which breaks MapLibre's {fontstack}/{range} tokens.
function resolveRelative(base, relative) {
  if (!relative || relative.startsWith('http')) return relative;
  const parts = base.split('/');
  parts.pop(); // drop filename, keep directory
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

async function fetchStyle(serviceUrl) {
  const rootUrl = `${serviceUrl}/resources/styles/root.json`;
  const res = await fetch(rootUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${rootUrl}`);

  const raw  = await res.text();
  const text = raw.startsWith('﻿') ? raw.slice(1) : raw; // strip UTF-8 BOM
  const style = JSON.parse(text);
  const resolve = (rel) => resolveRelative(rootUrl, rel);

  if (style.sprite) style.sprite = resolve(style.sprite);
  if (style.glyphs) style.glyphs = resolve(style.glyphs);

  for (const src of Object.values(style.sources ?? {})) {
    if (src.url) {
      // ArcGIS VectorTileServer returns proprietary JSON, not TileJSON.
      // Build tile URL directly; ArcGIS row/col order is {z}/{y}/{x}.
      const serviceRoot = resolve(src.url).replace(/\/$/, '');
      src.tiles = [`${serviceRoot}/tile/{z}/{y}/{x}.pbf`];
      src.minzoom = src.minzoom ?? 0;
      src.maxzoom = src.maxzoom ?? 19;
      delete src.url;
    }
    if (src.tiles) src.tiles = src.tiles.map((t) => resolveRelative(rootUrl, t));
    // Strip ArcGIS placeholder attribution ("me") — callers set it explicitly.
    delete src.attribution;
  }

  return style;
}

function prefixStyleEntries(style, prefix) {
  const srcMap = {};
  const sources = {};
  for (const [key, val] of Object.entries(style.sources ?? {})) {
    const newKey = `${prefix}_${key}`;
    sources[newKey] = val;
    srcMap[key] = newKey;
  }
  const layers = (style.layers ?? []).map((layer) => {
    const l = { ...layer, id: `${prefix}_${layer.id}` };
    if (l.source && srcMap[l.source]) l.source = srcMap[l.source];
    return l;
  });
  return { sources, layers };
}

async function buildFreshBasemapStyle() {
  const [base, labels] = await Promise.all([
    fetchStyle(`${AGRC_BASE}/LiteBase/VectorTileServer`),
    fetchStyle(`${AGRC_BASE}/LiteLabels/VectorTileServer`),
  ]);

  const { sources: baseSources, layers: baseLayers }   = prefixStyleEntries(base,   'litebase');
  const { sources: labelSources, layers: labelLayers } = prefixStyleEntries(labels, 'litelabels');

  const ugrcCredit = '© <a href="https://gis.utah.gov/" target="_blank" rel="noopener">Utah Geospatial Resource Center</a>';
  for (const src of Object.values(baseSources)) src.attribution = ugrcCredit;

  console.log('[AGRC] Built fresh style — LiteBase sprite:', base.sprite);

  return {
    version: 8,
    // LiteLabels has the most complete glyph ranges for text rendering
    glyphs:  labels.glyphs,
    // LiteBase sprite has the city/airport/POI icons used by litebase layers
    sprite:  base.sprite,
    sources: { ...baseSources, ...labelSources },
    layers:  [
      // Solid background so proto2-failed tile slots show a neutral colour
      // instead of transparent (the SW fix should eliminate most failures)
      { id: 'map-background', type: 'background', paint: { 'background-color': '#f5f0e8' } },
      ...baseLayers,
      ...labelLayers,
    ],
  };
}

// Returns the active basemap style.
// When USE_UGRC_BASEMAP is false, returns Carto Positron immediately.
// When true, fetches and caches the UGRC LiteBase + LiteLabels style.
export async function buildBasemapStyle() {
  if (!USE_UGRC_BASEMAP) return CARTO_POSITRON;

  try {
    const raw = localStorage.getItem(STYLE_CACHE_KEY);
    if (raw) {
      const { ts, style } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS) return style;
    }
  } catch {}

  try {
    const style = await buildFreshBasemapStyle();
    try { localStorage.setItem(STYLE_CACHE_KEY, JSON.stringify({ ts: Date.now(), style })); } catch {}
    return style;
  } catch (err) {
    console.warn('[AGRC] basemap unavailable, using Carto Positron fallback:', err.message);
    return CARTO_POSITRON;
  }
}

// Fetches UGRC VectorHillshade and inserts its layers below the first
// non-background layer of the already-loaded basemap.  Called after 'idle'
// so hillshade tiles don't compete with basemap tiles during initial load.
// The SW proto2 fix applies to hillshade tiles too.
export async function addHillshadeToMap(map) {
  if (!USE_UGRC_BASEMAP) return;

  let hillStyle;
  try {
    hillStyle = await fetchStyle(`${AGRC_BASE}/VectorHillshade/VectorTileServer`);
  } catch (err) {
    console.warn('[AGRC] VectorHillshade unavailable:', err.message);
    return;
  }

  const { sources, layers } = prefixStyleEntries(hillStyle, 'hillshade');

  // Insert before the first non-background layer so terrain sits below everything
  const firstNonBgId = map.getStyle().layers
    .find((l) => l.id !== 'map-background' && l.type !== 'background')?.id;

  for (const [id, src] of Object.entries(sources)) {
    if (!map.getSource(id)) map.addSource(id, src);
  }
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer, firstNonBgId);
  }

  console.log(`[AGRC] Hillshade added: ${layers.length} layers before "${firstNonBgId}"`);
}
