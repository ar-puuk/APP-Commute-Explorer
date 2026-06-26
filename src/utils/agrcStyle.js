const AGRC_BASE = 'https://tiles.arcgis.com/tiles/99lidPhWCzftIe9K/arcgis/rest/services';
const AGRC_SERVICES = ['VectorHillshade', 'LiteBase', 'LiteLabels'];
const FALLBACK_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function resolveUrl(base, relative) {
  if (!relative || relative.startsWith('http')) return relative;
  return new URL(relative, base + '/').href;
}

async function fetchStyle(serviceUrl) {
  const rootUrl = `${serviceUrl}/resources/styles/root.json`;
  const res = await fetch(rootUrl);
  if (!res.ok) throw new Error(`AGRC fetch failed: ${rootUrl}`);
  const style = await res.json();

  // Rewrite relative sprite / glyphs / source tile URLs to absolute
  if (style.sprite && !style.sprite.startsWith('http')) {
    style.sprite = resolveUrl(serviceUrl + '/resources/styles/', style.sprite);
  }
  if (style.glyphs && !style.glyphs.startsWith('http')) {
    style.glyphs = resolveUrl(serviceUrl + '/resources/styles/', style.glyphs);
  }
  if (style.sources) {
    for (const src of Object.values(style.sources)) {
      if (src.tiles) {
        src.tiles = src.tiles.map(t => resolveUrl(serviceUrl + '/', t));
      }
      if (src.url && !src.url.startsWith('http')) {
        src.url = resolveUrl(serviceUrl + '/', src.url);
      }
    }
  }
  return style;
}

export async function buildMergedAGRCStyle() {
  try {
    const styles = await Promise.all(
      AGRC_SERVICES.map(svc =>
        fetchStyle(`${AGRC_BASE}/${svc}/VectorTileServer`)
      )
    );

    // Merge: use first style as base, append sources+layers from subsequent styles
    // with prefixed source keys to avoid collisions
    const merged = { ...styles[0] };
    merged.sources = { ...styles[0].sources };
    merged.layers  = [...styles[0].layers];

    for (let i = 1; i < styles.length; i++) {
      const prefix = AGRC_SERVICES[i].toLowerCase() + '_';
      const srcMap = {};
      for (const [key, val] of Object.entries(styles[i].sources ?? {})) {
        const newKey = prefix + key;
        merged.sources[newKey] = val;
        srcMap[key] = newKey;
      }
      for (const layer of (styles[i].layers ?? [])) {
        const l = { ...layer };
        if (l.source && srcMap[l.source]) l.source = srcMap[l.source];
        l.id = prefix + l.id;
        merged.layers.push(l);
      }
      // Use LiteLabels glyphs/sprite (they include all needed fonts)
      if (i === styles.length - 1) {
        if (styles[i].glyphs) merged.glyphs = styles[i].glyphs;
        if (styles[i].sprite) merged.sprite = styles[i].sprite;
      }
    }

    return merged;
  } catch (err) {
    console.warn('AGRC tiles unavailable, falling back to OpenFreeMap:', err.message);
    const res = await fetch(FALLBACK_STYLE);
    return res.json();
  }
}
