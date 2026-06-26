# Research: Commute Flow Explorer

**Feature**: 001-commute-flow-explorer
**Date**: 2026-06-25

---

## DuckDB-WASM — In-Browser Parquet Query

**Decision**: Use `@duckdb/duckdb-wasm` MVPBundle (ESM). Register each year's Parquet as a
`CREATE OR REPLACE VIEW od AS SELECT * FROM parquet_scan('/data/od_{year}.parquet')`.

**Rationale**: DuckDB-WASM is the only production-grade SQL engine that runs fully in-browser
without a server. The MVPBundle avoids SharedArrayBuffer requirements (which need COOP/COEP
headers that GitHub Pages does not set). Parquet `parquet_scan` works directly over HTTP via
the browser's fetch API — no file-system access needed.

**Alternatives considered**:
- Apache Arrow WASM: no SQL interface; would require hand-written aggregation logic.
- SQLite WASM: columnar Parquet support is limited; would require converting Parquet to SQLite
  at build time, roughly doubling the data size.

**Key implementation note**: DuckDB-WASM v0.10+ requires the WASM bundle to be co-located or
served with correct MIME types. Vite's `public/` directory handles this automatically.

---

## H3-js — Client-Side Hex Resolution

**Decision**: Use `h3-js` v4 (ESM). Functions: `latLngToCell`, `gridDisk`, `cellToBoundary`.

**Rationale**: `h3-js` is the official JavaScript port of Uber's H3 library. It runs
synchronously in the main thread at negligible cost for the small cell counts involved
(max ~740 cells at k=3, 20 points). No WASM overhead.

**Alternatives considered**:
- `h3-wasm`: Faster for bulk operations but async API complicates the click handler; not
  needed at the cell counts this app uses.

**Key implementation note**: `cellToBoundary(id, true)` returns `[lng, lat]` pairs (GeoJSON
order) when the second argument is `true`. Without it, pairs are `[lat, lng]` (H3 native
order). Always pass `true` when constructing GeoJSON for MapLibre.

---

## MapLibre GL JS — Map Rendering

**Decision**: Use `maplibre-gl` v4 (ESM). H3 hex fills rendered as GeoJSON `fill` layers
updated via `map.getSource(id).setData(geojson)`. No MapLibre GL Draw.

**Rationale**: MapLibre GL JS is the open-source fork of Mapbox GL JS v1 with no API key
required. It supports dynamic GeoJSON sources, custom layers, and click events — everything
needed for point selection and hex rendering.

**Key implementation note**: The three AGRC style JSONs (VectorHillshade, LiteBase,
LiteLabels) use relative URLs for `sprite`, `glyphs`, and tile `url` fields. A
`resolveAGRCStyle(styleUrl)` utility must fetch each JSON and rewrite relative URLs to
absolute before merging into one MapLibre style object. Merge order: VectorHillshade sources
and layers first, LiteBase sources and layers appended (with `source` key prefixes to avoid
collision), LiteLabels sources and layers last.

---

## Flowmap.gl — Arc Layer

**Decision**: Use `@flowmap.gl/core` with a MapLibre custom layer adapter. Render
bidirectional straight arcs coloured by S000 on the GnBu colour scheme.

**Rationale**: Flowmap.gl is purpose-built for OD flow visualisation. It handles arc
offsetting for bidirectional flows, built-in cluster aggregation at low zoom, and tooltip
hooks. Using the GnBu ramp (Sequential Green-Blue) avoids red-green confusion and reads
clearly against the light Utah AGRC basemap.

**Alternatives considered**:
- Custom WebGL arcs: significantly more implementation effort with no benefit over Flowmap.gl.
- deck.gl ArcLayer directly: Flowmap.gl wraps deck.gl and adds OD-specific features.

**Key implementation note**: Self-loops (h_h3 === w_h3) should be rendered as a small ring
indicator at the cluster centroid rather than a zero-length arc. Flowmap.gl's `AnimatedFlowLayer`
handles this with a `selfLoop` property.

---

## Utah AGRC Vector Tiles

**Decision**: Fetch and merge three style JSONs in stacking order:
1. VectorHillshade (bottom terrain shading)
2. LiteBase (polygons, roads, land cover)
3. LiteLabels (place names, always on top)

All hosted at `https://tiles.arcgis.com/tiles/99lidPhWCzftIe9K/arcgis/rest/services/`

**Rationale**: Utah AGRC tiles are free, high-quality, and cover the entire Wasatch Front
area. No API key required. VectorHillshade provides topographic context useful for
understanding commute geography (e.g. the Wasatch Range barrier).

**Fallback**: If any AGRC style fetch fails (network error or non-200), the app falls back to
`https://tiles.openfreemap.org/styles/liberty` — a single-style URL that MapLibre can use
directly without merging.

---

## Python Pipeline — LODES Data

**Decision**: Use `pandas` + `pyarrow` for CSV ingestion and Parquet output. Use `h3-py` v4
(`h3.latlng_to_cell`, `h3.cell_to_latlng`) for block-to-hex assignment.

**Rationale**: Pandas handles the LODES CSV format (gzipped, large) efficiently with chunked
reading. PyArrow writes Parquet with Snappy compression giving the best size/speed tradeoff
for DuckDB-WASM consumption. h3-py v4 matches the h3-js v4 API semantics used in the browser.

**Key implementation note — WAC join**: WAC files provide SI01/SI02/SI03 keyed on `w_geocode`
(work block GEOID). The join must occur before hex aggregation — aggregate the block-level
SI counts alongside S000/SA01/SA02/SA03, not separately. Missing WAC rows for a block default
to SI01=SI02=SI03=0 (left join, fillna(0)).

**Key implementation note — aux deduplication**: The `ut_od_aux` file contains Utah residents
working out-of-state. When combined with the main file, rows are deduplicated on
`(h_geocode, w_geocode)` — keeping the higher count if a pair appears in both (which should
not happen but is a safety guard).

---

## GitHub Pages Deployment

**Decision**: Vite build outputs to `dist/`. GitHub Actions (`deploy.yml`) pushes `dist/` to
the `gh-pages` branch using `peaceiris/actions-gh-pages@v4`. Git LFS is enabled in the
checkout step (`lfs: true`) to ensure Parquet files are fetched.

**Rationale**: GitHub Pages serves static files at no cost. The `gh-pages` branch approach
keeps the main branch clean of build artefacts. Vite's production build applies tree-shaking,
code splitting, and asset hashing for optimal caching.

**Key implementation note**: DuckDB-WASM's WASM files must be copied to `public/` so Vite
treats them as static assets. Use Vite's `optimizeDeps.exclude: ['@duckdb/duckdb-wasm']`
and configure the bundle worker URL explicitly to avoid Vite trying to bundle the WASM binary.
