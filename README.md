# Commuter Flow Explorer

An interactive, client-side web app for exploring origin-destination commuter flows across the Wasatch Front metro area (8 Utah counties). Built for planners, researchers, and curious people who want to understand how workers move across the region.

**[Live demo →](https://wfrcanalytics.github.io/APP-Commute-Explorer/)**

---

## How this differs from [APP-WFRC-Commute-Patterns](https://github.com/WFRCAnalytics/APP-WFRC-Commute-Patterns)

WFRC maintains two commute flow tools built on the same LODES data. They answer different questions:

| | APP-WFRC-Commute-Patterns | APP-Commute-Explorer (this app) |
|---|---|---|
| **Geography** | Pre-defined zones — cities, counties, legislative districts | Free-placement — click anywhere on the map |
| **Spatial unit** | Administrative boundaries | H3 hexagonal cells (res-9, ~0.1 km²) |
| **Analysis mode** | One zone at a time: "where do Salt Lake City residents work?" | 2–10 custom points simultaneously: compare flows between any locations |
| **Best for** | Policy questions tied to jurisdictions and political districts | Site-specific studies — transit stops, employment centres, catchment areas |
| **Analytics depth** | Rich sidepanel — ACS commute mode, travel time, distance bands, industry mix | Focused on raw OD volumes and the OD matrix between selected points |
| **Region** | Statewide Utah | 8 Wasatch Front counties (configurable to any US region) |
| **Framework** | Vanilla JS | React 18 + Vite |

**Rule of thumb:** use Commute Patterns when your question is about a named jurisdiction; use Commute Explorer when you want to draw your own catchment areas and compare them.

---

## What it does

- **Overview mode** — opens with a full-region clustered flowmap of all commute flows. Zoom in to see flows disaggregate.
- **Point selection** — click "Select Points" and place 2–10 analysis points on the map. Each point captures a configurable ring of H3 hexagonal cells around the click location.
- **DuckDB-WASM queries** — LODES origin-destination data is queried entirely in the browser using DuckDB-WASM. No server, no API.
- **OD matrix** — wage and industry breakdown for every origin→destination pair in a colour-coded table.
- **Year slider** — explore commute patterns from 2002 to 2023.

---

## Tech stack

| Layer | Library |
|---|---|
| Map | [MapLibre GL JS](https://maplibre.org/) |
| Basemap | Carto Positron (default) · UGRC Vector LiteBase (optional) |
| Flow layer | [@flowmap.gl/layers](https://flowmap.gl) + [deck.gl](https://deck.gl) |
| In-browser SQL | [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) |
| Data format | [Apache Parquet](https://parquet.apache.org/) via [Apache Arrow](https://arrow.apache.org/) |
| H3 spatial index | [H3-js](https://h3geo.org/) |
| Framework | React 18 + Vite |

---

## Data sources

- **LODES OD data** — [US Census Bureau LEHD](https://lehd.ces.census.gov/) Origin-Destination Employment Statistics (LODES8), filtered to Wasatch Front counties
- **County boundaries** — US Census Bureau [TIGER/Line Shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
- **Basemap** — [Carto Positron](https://carto.com/basemaps) (default) · [UGRC Vector LiteBase](https://gis.utah.gov/) (optional)

---

## Local development

### Prerequisites

- Node.js 20+
- Python 3.11+ with [uv](https://github.com/astral-sh/uv)

### 1. Clone and install

```bash
git clone https://github.com/WFRCAnalytics/APP-Commute-Explorer.git
cd APP-Commute-Explorer
npm install
npm run dev           # http://localhost:5173
```

The pre-built Parquet data files for the Wasatch Front are committed to the repo, so the app runs immediately without re-running the pipeline.

### 2. Run the pipeline (only needed after changing counties or updating LODES data)

```bash
cd scripts
uv sync                              # install Python deps
uv run download_lodes.py             # LODES OD CSVs
uv run download_wac.py               # WAC industry CSVs
uv run download_crosswalk.py         # geography crosswalk → H3 IDs
uv run build_hex_meta.py             # public/data/hex_meta.parquet
uv run build_od_parquet.py           # public/data/od_2002…2023.parquet
uv run build_counties_geojson.py     # public/data/counties.geojson
```

---

## Adapting for another region

All county configuration lives in **`scripts/counties.yaml`** — edit this file only, then re-run the pipeline:

```yaml
counties:
  - { name: "Salt Lake", state: "ut", fips: "49035" }
  - { name: "Utah",      state: "ut", fips: "49049" }
  # add or remove counties here — no application code changes needed
```

FIPS codes are available at [census.gov](https://www.census.gov/library/reference/code-lists/ansi/ansi-codes-for-states.html). Cross-state metros work by adding counties from multiple states.

After editing `counties.yaml`, re-run all pipeline scripts. The app code requires zero changes.

---

## Enabling UGRC Vector LiteBase basemap

The app defaults to Carto Positron. To switch to UGRC's high-quality Utah vector basemap, set one flag in `src/utils/agrcStyle.js`:

```js
const USE_UGRC_BASEMAP = true;
```

This also enables the vector hillshade overlay. Requires a Service Worker (already included at `public/sw.js`) to fix proto2 tile encoding from ArcGIS VectorTileServer.

---

## Deployment

Push to `main` → GitHub Actions builds and deploys to GitHub Pages automatically.

```bash
git push origin main
```

The workflow is at `.github/workflows/deploy.yml`.

---

## Architecture

```
App.jsx                root state: year, kRing, appMode, points, overviewFlows
  usePoints.js         point CRUD, clusterIds (H3 gridDisk), overlap detection
  useDuckDB.js         DuckDB-WASM init, loadYear, queryOD, queryAllOD
  useFlows.js          drives DuckDB on points/year/kRing change → MatrixCells
  MapView.jsx          MapLibre map, UGRC/Carto basemap, click handler, markers
    HexLayer.jsx       GeoJSON fill layer for selected H3 clusters
    FlowLayer.jsx      Flowmap.gl arc layer (overview: clustered · select: OD pairs)
  ODMatrix.jsx         N×N OD table, colour-coded by flow magnitude
  PointList.jsx        sidebar: names, colours, county, reorder, delete
```

---

## License

MIT — data is public domain (US federal government).
