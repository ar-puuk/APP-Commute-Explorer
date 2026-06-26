# Commuter Flow Explorer — Product Specification
## Utah + Border Counties Edition

---

## Overview

A client-side web application that lets planners explore commuter origin-destination (OD) patterns by clicking points on a map. Block-level LODES OD data is pre-aggregated to H3 hexagons and stored as Parquet files queried in-browser with DuckDB-WASM. No server is required; the app is hosted on GitHub Pages.

The primary geography is the **Wasatch Front / Greater SLC metro** — eight Utah counties: Davis, Weber, Salt Lake, Morgan, Tooele, Utah, Summit, and Wasatch. The county list is driven by a `counties.yaml` config file so additional counties (including Utah's remaining counties or border counties in neighbouring states) can be added later by editing one file and re-running the pipeline.

---

## Goals

- Let planners click two or more points on a map to select H3 hexagons as analysis zones.
- Query pre-aggregated OD flows between every pair of selected hexagons (including within the same hex) using DuckDB-WASM.
- Visualise flows as weighted arcs (Flowmap.gl) on the map and as a colour-coded OD matrix table.
- Let planners switch between map view and matrix view, manage their point list, and name points.
- Cover the Wasatch Front metro counties with a config-driven county list that makes adding further counties or cross-state border counties straightforward.
- Expose wage-segment and industry breakdowns on demand via hover tooltips in both map and matrix views.
- Run entirely serverlessly (static files on GitHub Pages).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite (React) |
| Map | MapLibre GL JS |
| H3 hex rendering | MapLibre H3 layer (via `h3-js` + GeoJSON fill) |
| Point interaction | MapLibre click events |
| Flow visualisation | Flowmap.gl arc layer |
| In-browser data query | DuckDB-WASM |
| Pre-processing | Python (managed with `uv`) |
| H3 indexing (pre-processing) | `h3-py` |
| Basemap | Utah AGRC LiteBase + LiteLabels + VectorHillshade (vector tiles) |
| Flow lines | Flowmap.gl — bidirectional straight lines, GnBu colour scheme |
| Hosting | GitHub Pages (static) |

> **Removed from previous design:** MapLibre GL Draw (polygon draw), Turf.js (points-in-polygon). These are no longer needed — selection is now point-click to H3 hex, resolved entirely by the H3 library.

---

## H3 Resolution and K-Ring Aggregation

Block-level LODES data is pre-aggregated to **H3 resolution 9** before storage.

| Resolution | Avg cell area | Comparable unit |
|---|---|---|
| 7 | ~5.16 km² | Neighbourhood / small city district |
| 8 | ~0.74 km² | Census tract (SLC urban core) |
| **9** | **~0.11 km²** | **Census block group / dense block** |
| 10 | ~0.015 km² | Census block |

Resolution 9 provides finer spatial precision (~0.11 km² per cell) than a typical SLC census tract. To compensate and reach census-tract-scale analysis volumes, each selected point expands at query time to a **k-ring cluster** — the clicked cell plus its k rings of neighbours — controlled by a user-adjustable global setting (default k=1).

### K-ring cluster sizes

| k (rings) | Cells in cluster | Approx. total area | Planning analogy |
|---|---|---|---|
| 0 | 1 cell | ~0.11 km² | Single block group |
| **1** | **7 cells** | **~0.77 km²** | **Census tract (default)** |
| 2 | 19 cells | ~2.1 km² | Large census tract / small district |
| 3 | 37 cells | ~4.1 km² | Neighbourhood |

At k=1, the 7-cell cluster (~0.77 km²) matches resolution 8 area while preserving res 9 click precision. Planners can set k=0 for a single-cell selection in dense urban areas, or increase k to capture larger catchment zones.

### Parquet file size at resolution 9

Utah has approximately **200,000–250,000 populated res 9 cells**. The aggregated OD Parquet is expected to have **500,000–1,500,000 unique hex-pair rows** per year. At Snappy compression this is roughly **20–60 MB per year file** — within GitHub Pages limits and DuckDB-WASM's in-browser capability.

> **Note on k-ring overlap:** When two selected points are close together (e.g. in dense downtown SLC), their k=1 rings may overlap. Shared cells will be counted under both points, potentially double-counting those flows in the OD matrix. The app shows a warning when overlap is detected but does not attempt to resolve it — spacing points further apart is the planner's responsibility. Setting k=0 eliminates overlap entirely.

---

## Geography

### Active counties (v1)

The pipeline filters all LODES OD data to blocks whose home **or** work county is in the active county list. The list is defined in `scripts/counties.yaml` and read by `scripts/config.py`.

| County | FIPS | Notes |
|---|---|---|
| Salt Lake | 49035 | Core metro, highest flow volumes |
| Utah | 49049 | Provo/Orem metro |
| Davis | 49011 | North corridor, I-15 |
| Weber | 49057 | Ogden metro |
| Tooele | 49045 | West of SLC, growing commuter shed |
| Summit | 49043 | Park City / I-80 corridor |
| Wasatch | 49051 | Heber Valley, US-189 corridor |
| Morgan | 49029 | I-84 corridor, small but connected |

Utah LODES data is available for years **2002–2023** (LODES 8.4, vintage 20251202). All years are pre-processed.

### Why not statewide?

H3 resolution 9 cells (~0.11 km²) are smaller than many rural Utah census blocks. Aggregating sparse rural blocks into res 9 hexes produces large numbers of near-empty cells that bloat the Parquet files without adding planning value. The eight-county area covers the vast majority of Utah's commuter activity and keeps per-year Parquet files small.

### Adding counties later

To add a county (Utah or cross-state border county):
1. Add an entry to `scripts/counties.yaml`.
2. Re-run the pipeline scripts.
3. Commit the updated Parquet files.

No application code changes are needed — the app is county-agnostic; it works with whatever H3 cells exist in the Parquet.

> **Cross-state border counties** (e.g. Uinta County WY for the Evanston commute shed, Franklin County ID for the Logan area) can be added to `counties.yaml` exactly like Utah counties. The pipeline already downloads the Utah aux OD file and can be extended to pull neighbouring-state OD files for specific county GEOIDs. This is noted in Future Extensions.

---

## Data

### Source: LEHD LODES 8 (version 8.4)

- **Job type**: `JT00` (All Jobs)
- **Segment**: `S000` (total) + `SA01` (low wage) + `SA02` (mid wage) + `SA03` (high wage)
- **Years**: 2002–2023 (all available years)
- **File types needed**:
  - `ut_od_main_JT00_{year}.csv.gz` — Utah intra-state OD flows
  - `ut_od_aux_JT00_{year}.csv.gz` — Utah-resident workers employed outside UT
  - For each border state: `{st}_od_main_JT00_{year}.csv.gz` filtered to border county GEOIDs only
  - `{state}_wac_S000_JT00_{year}.csv.gz` — Workplace Area Characteristics for industry breakdown, joined by work block at build time

### LODES URL patterns

```
# OD files
https://lehd.ces.census.gov/data/lodes/LODES8/{state}/od/{state}_od_{type}_JT00_{year}.csv.gz

# WAC files
https://lehd.ces.census.gov/data/lodes/LODES8/{state}/wac/{state}_wac_S000_JT00_{year}.csv.gz

# Geography crosswalk (block internal points)
https://lehd.ces.census.gov/data/lodes/LODES8/{state}/{state}_xwalk.csv.gz
```

### Source: LODES Geography Crosswalk (block internal points)

Block coordinates come from the **LODES xwalk** (`{state}_xwalk.csv.gz`). Relevant columns: `tabblk2020` (block GEOID), `blklon`, `blklat`. These are the same internal points used by OnTheMap and are matched to the LODES 8 block vintage — no TIGER shapefile processing needed.

### Pre-processed Output

The Python pipeline runs once before deployment and outputs static files into `public/data/`:

```
public/data/
  od_2002.parquet
  od_2003.parquet
  ...
  od_2023.parquet        # one file per year — H3-aggregated OD flows
  hex_meta.parquet       # H3 cell index with centroid lon/lat + border tier
```

> The old `centroids.parquet` (block-level) is replaced by `hex_meta.parquet` (H3-level). Block centroids are an intermediate build artifact only, not shipped to the browser.

Expected file sizes at H3 resolution 9:
- `hex_meta.parquet` — ~2–4 MB (one row per populated H3 cell)
- `od_{year}.parquet` — ~5–20 MB per year (aggregated hex-pair rows)
- Total across 22 years: ~110–450 MB

> **Git LFS:** Files above 50 MB should use Git LFS. At resolution 9, some year files may approach this threshold — configure Git LFS as a safeguard.

#### `hex_meta.parquet` schema

| Column | Type | Description |
|---|---|---|
| `h3_id` | string | H3 cell index at configured resolution (e.g. `"892a100d2bfffff"`) |
| `lon` | float32 | H3 cell centroid longitude |
| `lat` | float32 | H3 cell centroid latitude |
| `state_fips` | string | 2-digit state FIPS of the plurality block in the cell |
| `county_fips` | string | 5-digit county FIPS of the plurality block |
| `county_name` | string | Human-readable county name from `counties.yaml` |

#### `od_{year}.parquet` schema

| Column | Type | Description |
|---|---|---|
| `w_h3` | string | Work (destination) H3 cell index |
| `h_h3` | string | Home (origin) H3 cell index |
| `S000` | int32 | Total commuters (sum of block-pair flows aggregated to hex-pair) |
| `SA01` | int32 | Low-wage commuters (≤$1,250/month) |
| `SA02` | int32 | Mid-wage commuters ($1,251–$3,333/month) |
| `SA03` | int32 | High-wage commuters (>$3,333/month) |
| `SI01` | int32 | Goods-producing industry jobs at destination (from WAC, aggregated) |
| `SI02` | int32 | Trade, transport & utilities jobs at destination |
| `SI03` | int32 | Other services jobs at destination |
| `w_lon` | float32 | Work hex centroid lon |
| `w_lat` | float32 | Work hex centroid lat |
| `h_lon` | float32 | Home hex centroid lon |
| `h_lat` | float32 | Home hex centroid lat |

> `w_lon/w_lat` and `h_lon/h_lat` are H3 cell centroids (not block centroids), pre-joined from `hex_meta` at build time so Flowmap.gl has coordinates without a runtime join.

---

## Python Pre-processing Pipeline

Managed with `uv`. All scripts live in `scripts/`. Configuration in `scripts/config.py`.

### `scripts/config.py`

```python
import yaml
from pathlib import Path

H3_RESOLUTION = 9          # resolution 9 + k-ring aggregation at query time
YEARS = list(range(2002, 2024))
LODES_BASE = "https://lehd.ces.census.gov/data/lodes/LODES8"
OUTPUT_DIR = "../public/data"
CACHE_DIR = ".cache"

# Load county list from counties.yaml
_yaml_path = Path(__file__).parent / "counties.yaml"
with open(_yaml_path) as f:
    _county_config = yaml.safe_load(f)

# Active counties: list of 5-digit FIPS strings
ACTIVE_COUNTIES: list[str] = [c["fips"] for c in _county_config["counties"]]

# State codes needed for LODES downloads (derived from FIPS prefixes)
ACTIVE_STATES: list[str] = list({c["state"] for c in _county_config["counties"]})
```

### `scripts/counties.yaml`

```yaml
# Add or remove counties here. Re-run the pipeline after any change.
# state: two-letter lowercase LODES state code
# fips:  5-digit county FIPS string

counties:
  - { name: "Salt Lake",  state: "ut", fips: "49035" }
  - { name: "Utah",       state: "ut", fips: "49049" }
  - { name: "Davis",      state: "ut", fips: "49011" }
  - { name: "Weber",      state: "ut", fips: "49057" }
  - { name: "Tooele",     state: "ut", fips: "49045" }
  - { name: "Summit",     state: "ut", fips: "49043" }
  - { name: "Wasatch",    state: "ut", fips: "49051" }
  - { name: "Morgan",     state: "ut", fips: "49029" }

  # To add cross-state border counties, append entries like:
  # - { name: "Uinta (WY)", state: "wy", fips: "56041" }
  # - { name: "Franklin (ID)", state: "id", fips: "16041" }
```

### `scripts/download_lodes.py`

1. For each unique state in `ACTIVE_STATES` (derived from `counties.yaml`), download `{state}_od_main_JT00_{year}.csv.gz` and `{state}_od_aux_JT00_{year}.csv.gz` for all years.
2. Filter rows to keep only those where `h_geocode[:5]` **or** `w_geocode[:5]` is in `ACTIVE_COUNTIES`. This captures flows where either the home or work block is in an active county — cross-county commuters are preserved.
3. Deduplicate rows that appear in both a `main` and `aux` file for the same state-year.
4. Save filtered CSVs to `scripts/.cache/od/` to avoid re-downloading.

### `scripts/download_wac.py`

1. For each state in `ACTIVE_STATES`, download `{state}_wac_S000_JT00_{year}.csv.gz` for all years.
2. Keep only `w_geocode`, `SI01`, `SI02`, `SI03`.
3. Filter rows to work blocks in `ACTIVE_COUNTIES` only (`w_geocode[:5] in ACTIVE_COUNTIES`).
4. Save to `scripts/.cache/wac/` — consumed only during `build_od_parquet.py`, not shipped to the browser.

### `scripts/download_crosswalk.py`

1. For each state in `ACTIVE_STATES`, download `{state}_xwalk.csv.gz`.
2. Extract `tabblk2020`, `blklon`, `blklat`, `cty` (county FIPS).
3. Filter rows to blocks in `ACTIVE_COUNTIES` only (`cty in ACTIVE_COUNTIES`).
4. Tag each row with `state_fips` and `county_fips` (derived from `cty`).
5. Assign H3 index: `h3.latlng_to_cell(blklat, blklon, H3_RESOLUTION)` (h3-py v4; use `h3.geo_to_h3` for v3).
6. Save as `scripts/.cache/block_h3_lookup.parquet` — columns: `geoid`, `h3_id`, `blklon`, `blklat`, `state_fips`, `county_fips`.

### `scripts/build_hex_meta.py`

1. Load `block_h3_lookup.parquet`.
2. Group by `h3_id`; assign `state_fips` and `county_fips` from the plurality block in the cell (most blocks by count wins).
3. Compute H3 cell centroid: `h3.cell_to_latlng(h3_id)` → `lon`, `lat`.
4. Join human-readable county name from `counties.yaml` via `county_fips`.
5. Save as `public/data/hex_meta.parquet`.

### `scripts/build_od_parquet.py`

For each year:
1. Load combined OD CSV (main + aux + border cross-flows) from cache.
2. Join `h3_id` for home block (`h_h3`) and work block (`w_h3`) from `block_h3_lookup.parquet`.
3. Drop rows where either H3 ID is missing.
4. Join WAC industry columns (`SI01`, `SI02`, `SI03`) keyed on `w_geocode`; default missing to 0.
5. Group by `(h_h3, w_h3)` summing `S000`, `SA01`, `SA02`, `SA03`, `SI01`, `SI02`, `SI03`.
6. Join work and home hex centroids (`w_lon`, `w_lat`, `h_lon`, `h_lat`) from `hex_meta.parquet`.
7. Cast all count columns to `int32`, lon/lat to `float32`.
8. Write to `public/data/od_{year}.parquet` with Snappy compression.
9. Print: unique hex-pairs, total commuters, file size. Warn if file exceeds 90 MB.

### `pyproject.toml`

```toml
[project]
name = "commuter-flow-preprocess"
requires-python = ">=3.11"
dependencies = [
    "pandas>=2.0",
    "pyarrow>=14.0",
    "h3>=4.0",
    "pyyaml>=6.0",
    "requests>=2.31",
    "tqdm>=4.66",
]
```

---

## Application Structure

```
src/
  main.jsx
  App.jsx                    # root state: year, kRing, points list, flows, active view
  components/
    MapView.jsx              # MapLibre GL map, hex layer, arc layer, point markers
    HexLayer.jsx             # H3 hex fill for selected cells (via h3-js → GeoJSON)
    FlowLayer.jsx            # Flowmap.gl arc layer wrapper
    PointList.jsx            # sidebar list of selected points with name/reorder/delete
    ODMatrix.jsx             # colour-coded OD matrix table with hover tooltips
    ViewToggle.jsx           # Map / Matrix toggle control
    YearSelector.jsx         # year dropdown
    CrossStateBadge.jsx      # indicator showing which county each selected point falls in
  hooks/
    useDuckDB.js             # init DuckDB-WASM, register Parquet view, expose queryOD()
    usePoints.js             # manages point list state (add, delete, rename, reorder)
    useFlows.js              # runs DuckDB query when point list or year changes
  utils/
    h3Utils.js               # thin wrappers around h3-js (latLngToCell, gridDisk, cellToBoundary)
    colors.js                # sequential colour scale for OD matrix cells
    countyConfig.js          # county list and metadata loaded from hex_meta at startup
    agrcStyle.js             # resolveAGRCStyle() — fetches and merges the 3 AGRC style JSONs into one MapLibre style
public/
  data/
    hex_meta.parquet
    od_2002.parquet
    ...
    od_2023.parquet
```

---

## User Interface

### Map (full screen)

- MapLibre GL JS base map — **Utah AGRC vector tiles**, no API key required. Three layers are composited in order:
  1. **VectorHillshade** — terrain shading, bottommost layer (`VectorHillshade/VectorTileServer`)
  2. **LiteBase** — polygons, roads, land cover, drawn above hillshade (`LiteBase/VectorTileServer`)
  3. **LiteLabels** — place names and annotations, always on top (`LiteLabels/VectorTileServer`)

  All three are Utah-specific vector tile services hosted at:
  ```
  https://tiles.arcgis.com/tiles/99lidPhWCzftIe9K/arcgis/rest/services/{service}/VectorTileServer
  ```
  Style JSON roots in stacking order (bottom to top):
  ```
  VectorHillshade:.../VectorHillshade/VectorTileServer/resources/styles/root.json
  LiteBase:       .../LiteBase/VectorTileServer/resources/styles/root.json
  LiteLabels:     .../LiteLabels/VectorTileServer/resources/styles/root.json
  ```
  > **Implementation note:** These styles use relative URLs for `sprite`, `glyphs`, and tile `url` fields (e.g. `"../sprites/sprite"`, `"../../"`). When loading outside an Esri viewer, all relative URLs must be resolved to absolute URLs before passing to MapLibre. A small `resolveAGRCStyle(styleUrl)` utility function should fetch the JSON and rewrite these paths before calling `new maplibregl.Map({ style: resolvedStyle })`. The three styles are merged into a single MapLibre style object in stacking order: VectorHillshade sources and layers first, then LiteBase sources and layers appended, then LiteLabels sources and layers on top.
- **H3 hex fill layer**: selected hexagons are highlighted with a semi-transparent fill. Each hex is coloured by its point label colour (see Points List below).
- **Flowmap.gl arc layer**: bidirectional **straight lines** between selected hex centroids, weighted by `S000`. Colour scheme: **GnBu** (light green-blue for low volumes → dark blue for high). Cluster aggregation at low zoom (built-in). Bidirectional means both A→B and B→A flows are shown as parallel offset lines on the same path.
- **Point markers**: numbered/labelled pins at each clicked location, matching the Points List order.
- Unselected hexes are not rendered (no background hex grid — only the selected ones).

### Top toolbar

```
[ Year: 2023 ▾ ]   [ Ring size: 1 ▾ ]           [ Map view ]  [ Matrix view ]
```

Year selector and ring size selector on the left. View toggle on the right.

**Ring size selector** — a small dropdown (or stepper) labelled "Ring size" with options 0, 1, 2, 3. Default is 1. Changing ring size immediately re-expands all point clusters and re-queries DuckDB. A tooltip on the control reads: *"Number of H3 rings around each clicked cell. k=0: single cell (~0.11 km²). k=1: 7 cells, ~census tract (default). k=2: 19 cells. k=3: 37 cells."*

### Points list (left sidebar panel)

Displays all user-selected points in order. Each row shows:

```
[1]  🔵  Downtown SLC          [↑] [↓] [✎] [×]
[2]  🟠  Airport               [↑] [↓] [✎] [×]
[3]  🟢  (unnamed point 3)     [↑] [↓] [✎] [×]
         + Add point (click map)
```

- **Colour**: each point gets a unique colour from a categorical palette (up to ~12 colours).
- **Name**: defaults to `"Point N"` where N is the order added; user can click ✎ to rename inline with a unique custom name. Names must be unique — duplicate names show a validation error.
- **Reorder**: ↑ / ↓ arrows (or drag-and-drop as a stretch goal) reorder the list. Order determines row/column order in the OD matrix.
- **Delete**: × removes the point and its hex from the selection; flows and matrix update immediately.
- **Add**: clicking on the map always adds a new point (no mode toggle needed). Clicking on a hex that is already claimed by another point's k-ring is a no-op (shows a tooltip: *"Already in selection — try spacing points further apart or reducing Ring size"*).
- **Overlap warning**: when two points' k-rings share one or more cells (possible at k≥1 with nearby clicks), a yellow warning banner appears below the Points List: *"⚠ Rings overlap between [Point A] and [Point B]. Flows in shared cells are counted in both. Reduce Ring size or space points further apart."* The warning lists all overlapping pairs. Flows are still displayed — the planner decides how to interpret the data.
- **Minimum**: 2 points required before flows are shown. With 0 or 1 points the map shows an empty state prompt.

### Map view

- Shows hex fills for all cells in each point's k-ring cluster, coloured by that point's colour.
- Shows Flowmap.gl **bidirectional straight lines** between point cluster centroids for all OD pairs (including self-loops, rendered as a small indicator on the cluster centroid).
- Line colour: **GnBu** scale driven by `S000` — not per-point colour. GnBu reads clearly against the light Utah AGRC basemap.
- Overlapping cells (when two rings share hexes) are rendered with a hatched or dual-colour fill to make the overlap visually obvious.
- **Hover tooltip on an arc**: a floating tooltip appears showing the same breakdown format as the matrix tooltip:
  ```
  Downtown SLC → Airport
  ───────────────────────
  Total commuters   820
  Low wage   (SA01) 210   26%
  Mid wage   (SA02) 340   41%
  High wage  (SA03) 270   33%
  ───────────────────────
  Goods-producing   (SI01) 180   22%
  Trade / transport (SI02) 390   48%
  Other services    (SI03) 250   30%
  ───────────────────────
  ⓘ Industry reflects job type at destination
  ```
- **Hover tooltip on a hex cluster**: shows the point name, county, total outbound commuters, and total inbound commuters for that cluster:
  ```
  Downtown SLC — Salt Lake County
  Outbound (as origin): 2,580
  Inbound  (as dest):   1,860
  ```

### Matrix view

Full-screen OD matrix table replacing the map. Rows = origins (home), columns = destinations (work), in Points List order.

```
            Downtown SLC   Airport   Point 3   TOTAL →
Downtown SLC     [1,450]      [820]      [310]    2,580
Airport           [230]      [95]        [60]      385
Point 3           [180]      [140]      [210]      530
TOTAL ↓          1,860      1,055        580
```

- **Cell colour**: sequential scale (e.g. white → dark teal) normalised to the maximum cell value in the matrix. Higher commuter volumes = darker colour. Diagonal cells (within-hex flows) use the same scale.
- **Zero cells**: displayed as `—` with no colour fill, to distinguish from low-but-nonzero values.
- **Totals row/column**: shown in bold, not colour-coded.
- **Hover tooltip on any cell**: a floating tooltip appears on hover showing:
  ```
  Downtown SLC → Airport
  ───────────────────────
  Total commuters   820
  Low wage   (SA01) 210   26%
  Mid wage   (SA02) 340   41%
  High wage  (SA03) 270   33%
  ───────────────────────
  Goods-producing   (SI01) 180   22%
  Trade / transport (SI02) 390   48%
  Other services    (SI03) 250   30%
  ───────────────────────
  ⓘ Industry reflects job type at destination
  ```
  Percentages are share of `S000`. The industry note clarifies that SI values describe the destination's job mix, not individual commuters.
- Matrix updates reactively when points are added, deleted, renamed, or reordered. Column and row headers use the user's custom point names.

### Side panel (visible in both views, below Points List)

The side panel shows only the **total commuter count** for all selected flows — a single headline number. Wage and industry breakdowns are available on demand via hover tooltips (see Map view and Matrix view sections).

```
Total commuters: 14,820
```

Below each point in the Points List, show the county name derived from `hex_meta`:
```
[1]  🔵  Downtown SLC   Salt Lake County    [↑] [↓] [✎] [×]
[2]  🟠  Airport        Salt Lake County    [↑] [↓] [✎] [×]
[3]  🟢  Point 3        Davis County        [↑] [↓] [✎] [×]
```
If a future county addition includes a cross-state county, the county name (from `counties.yaml`) will appear naturally without any special-case logic.

---

## Interaction Flow

1. User opens the app. Map loads centred on Utah. Points List is empty. Prompt: *"Click anywhere on the map to add a point."*
2. User clicks a location. The res 9 H3 cell containing that click is resolved via `latLngToCell(lat, lng, 9)`. The k-ring cluster (default k=1 → 7 cells) is computed via `gridDisk(h3Id, k)`. Cluster cells are highlighted on the map. Point added to the list as "Point 1".
3. User clicks a second location → "Point 2". Its k-ring cluster is computed. If any cells overlap with Point 1's cluster, the overlap warning appears.
4. With 2+ points, DuckDB is queried immediately using the union of all cluster cell IDs. Results populate the arc layer and OD matrix.
5. User adjusts Ring size from 1 → 0 (single cell) to eliminate overlap. All clusters re-expand and DuckDB re-queries.
6. User can rename "Point 1" → "Downtown SLC" by clicking ✎. Matrix headers update.
7. User can add more points, delete any point, or reorder the list.
8. User toggles to Matrix view to inspect the full OD table with colour coding.
9. User changes year from 2023 → 2019 in the dropdown. DuckDB re-queries the new year's Parquet.

---

## DuckDB-WASM Query Pattern

```js
// hooks/useDuckDB.js (simplified)
import * as duckdb from '@duckdb/duckdb-wasm';

let conn = null;
let currentYear = null;

export async function initDB() {
  const db = await duckdb.createInBrowser({ /* mvp bundle */ });
  conn = await db.connect();
}

export async function loadYear(year) {
  if (year === currentYear) return;
  await conn.query(`
    CREATE OR REPLACE VIEW od AS
    SELECT * FROM parquet_scan('/data/od_${year}.parquet')
  `);
  currentYear = year;
}

export async function queryOD(pointClusters) {
  // pointClusters: Map<pointId, Set<h3_id>> — each point's k-ring cell set
  // allHexIds: flat union of all cluster cells across all points
  const allHexIds = [...new Set([...pointClusters.values()].flatMap(s => [...s]))];
  const list = allHexIds.map(h => `'${h}'`).join(',');

  return conn.query(`
    SELECT
      h_h3, w_h3,
      h_lon, h_lat, w_lon, w_lat,
      S000, SA01, SA02, SA03, SI01, SI02, SI03
    FROM od
    WHERE h_h3 IN (${list})
      AND w_h3 IN (${list})
  `);
  // Returns all flows where BOTH origin and destination cells are anywhere
  // in the union of selected clusters, including self-loops (h_h3 = w_h3).
  // The caller (useFlows.js) maps each h_h3/w_h3 back to its point(s) to
  // populate the OD matrix cells — a cell shared by two clusters will
  // contribute to both relevant matrix entries.
}
```

`hex_meta.parquet` is loaded once at startup into a small JS lookup object (`Map<h3_id, {lon, lat, county_fips, county_name}>`). It is used to:
- Look up `county_name` when a hex is selected (to show the county label in the Points List)
- Provide centroid coordinates to Flowmap.gl if needed as a fallback

---

## H3 Click Resolution

When the user clicks the map:

```js
import { latLngToCell, gridDisk, cellToBoundary } from 'h3-js';

const H3_RESOLUTION = 9;

function onMapClick(e) {
  const { lng, lat } = e.lngLat;
  const h3Id = latLngToCell(lat, lng, H3_RESOLUTION);  // clicked cell

  // Expand to k-ring cluster (k from global UI setting, default 1)
  const clusterIds = gridDisk(h3Id, kRing);  // k=1 → [h3Id, ...6 neighbours]

  // Check if clicked cell is already owned by an existing point
  if (allClaimedHexIds.has(h3Id)) {
    showTooltip('Already in selection — try spacing points further apart or reducing Ring size');
    return;
  }

  // Check for overlap with existing clusters
  const overlappingPoints = findOverlappingPoints(clusterIds, existingClusters);
  if (overlappingPoints.length > 0) showOverlapWarning(overlappingPoints);

  // Build GeoJSON for all cells in cluster (for MapLibre fill layer)
  const clusterGeoJSON = {
    type: 'FeatureCollection',
    features: clusterIds.map(id => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [cellToBoundary(id, true)] },
      properties: { h3Id: id, pointId: newPointId }
    }))
  };

  addPoint({ h3Id, clusterIds, clusterGeoJSON, lat, lng });
}
```

Each point's cluster is rendered as a MapLibre `fill` layer feature collection. No separate hex grid tileset is needed — only the selected clusters are rendered.

---

## Performance Considerations

| Concern | Mitigation |
|---|---|
| Parquet load on first query | Lazy-load: only fetch the selected year's Parquet on first query |
| Year switch | `CREATE OR REPLACE VIEW` swaps Parquet cheaply; no full re-download if cached by browser |
| Large `IN` clause | Max realistic selection is ~20 points; `IN` clause stays tiny |
| Self-loop arc rendering | Render as small curved arc or ring indicator on the hex; Flowmap.gl handles this |
| OD matrix with many points | Matrix is N×N; at 20 points = 400 cells — trivially small |
| Git file size | Git LFS for Parquet files > 50 MB; at res 9 some year files may approach this threshold |

---

## Map Initial View

```js
const INITIAL_VIEW = {
  center: [-111.89, 40.55],  // centre of the 8-county Wasatch Front area
  zoom: 9.0,                 // shows all 8 counties comfortably
  pitch: 0,
  bearing: 0,
};
```

---

## Build & Deploy

```bash
# Pre-process (run once, or when LODES updates)
cd scripts
uv run download_lodes.py
uv run download_wac.py
uv run download_crosswalk.py
uv run build_hex_meta.py
uv run build_od_parquet.py

# Dev
cd ..
npm run dev

# Deploy
npm run build
# GitHub Actions pushes dist/ to gh-pages branch
```

### GitHub Actions (`deploy.yml`)

```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> Pre-processing scripts are not run in CI. Parquet files are committed (via Git LFS if needed) so builds are fast and deterministic. Re-run scripts locally when LODES releases a new year.

---

## Known Constraints & Open Questions

### H3 resolution and k-ring
The pipeline uses resolution 9 (stored in Parquet). The k-ring expansion happens entirely at query time in the browser — no changes to the Parquet files are needed if the default k is changed. The `H3_RESOLUTION` constant in `config.py` should match the resolution used at query time in `h3Utils.js`.

### Cross-state OD matching
The pipeline scopes all downloads to `ACTIVE_COUNTIES`. Cross-state counties (e.g. Uinta WY, Franklin ID) can be added to `counties.yaml` when needed. The pipeline will then download the relevant neighbouring-state OD and xwalk files automatically, since `ACTIVE_STATES` is derived from the county list.

### Year coverage
Years 2020 and 2021 reflect COVID disruption. The UI should show a warning indicator for these years. Years before 2009 use slightly different block vintages but `S000/SA01/SA02/SA03` columns are consistent throughout.

### Map tile provider
**Utah AGRC vector tiles** (LiteBase + VectorHillshade + LiteLabels) — no API key required, hosted by the Utah Geospatial Resource Center. These are Utah-specific services; they cover the full extent of the active county area. The `resolveAGRCStyle()` utility handles the relative-URL rewriting required when loading these styles outside an Esri context. If the AGRC tile server is unavailable, fall back to **OpenFreeMap** (`https://tiles.openfreemap.org/styles/liberty`).

### Future extensions
- **County/place shortcut**: let the planner type a place name to snap to its H3 centroid, instead of clicking.
- **Export to CSV**: download the filtered OD matrix or flow table.
- **Year comparison**: delta view showing change in flows between two years.
- **Cross-state border counties**: add Uinta County WY (Evanston commute shed), Franklin County ID (Logan area), or Mesa County CO (Grand Junction) by appending entries to `counties.yaml` — no code changes needed.
- **Extend to full Utah**: add remaining Utah counties to `counties.yaml` if statewide coverage is needed. Rural counties with sparse blocks will still work at res 9 — just expect near-empty hexes in low-density areas.
