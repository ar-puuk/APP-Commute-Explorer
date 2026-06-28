<!-- SPECKIT START -->
For additional context about technologies, project structure, and implementation details,
read the current plan: specs/001-commute-flow-explorer/plan.md
<!-- SPECKIT END -->

# Commute Flow Explorer — Developer Guide

## What This App Does

A client-side-only web app for exploring commuter origin-destination flows in the Wasatch
Front metro area (8 Utah counties). Planners click locations on a MapLibre map → H3
resolution-9 hexagonal clusters are highlighted → DuckDB-WASM queries pre-processed LODES
Parquet files in-browser → Flowmap.gl renders bidirectional arc flows and an OD matrix.
No server required. Hosted on GitHub Pages.

## Key Documents

- **Constitution**: `.specify/memory/constitution.md` — governing principles (read first)
- **Spec**: `specs/001-commute-flow-explorer/spec.md` — user stories and requirements
- **Plan**: `specs/001-commute-flow-explorer/plan.md` — architecture and phase decisions
- **Data model**: `specs/001-commute-flow-explorer/data-model.md` — Parquet schemas + JS entities
- **Tasks**: `specs/001-commute-flow-explorer/tasks.md` — ordered implementation task list
- **Quickstart**: `specs/001-commute-flow-explorer/quickstart.md` — manual validation scenarios

## Dev Commands

```bash
# Install frontend dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build → dist/
npm run build

# Preview production build locally
npx serve dist
```

## Pipeline Commands (run once, or after LODES update)

```bash
cd scripts
uv sync                        # install Python deps
uv run download_lodes.py       # download + filter LODES OD CSVs
uv run download_wac.py         # download + filter WAC industry CSVs
uv run download_crosswalk.py   # download xwalk, assign H3 IDs → .cache/block_h3_lookup.parquet
uv run build_hex_meta.py       # → public/data/hex_meta.parquet
uv run build_od_parquet.py     # → public/data/od_{2002..2023}.parquet
uv run build_counties_geojson.py  # → public/data/counties.geojson (map boundary overlay)
```

Pipeline outputs go to `public/data/`. Parquet files are committed as regular git objects (no Git LFS).

## Adding Counties

Edit `scripts/counties.yaml` only — add an entry with `name`, `state`, and `fips`. Re-run
all pipeline scripts. Zero application code changes needed.

## Critical Constants

`H3_RESOLUTION = 9` appears in **both**:
- `scripts/config.py` (pipeline)
- `src/utils/h3Utils.js` (browser)

These MUST stay in sync. Changing resolution requires re-running the full pipeline.

## Architecture Quick Reference

```
App.jsx             root state: year, kRing, activeView, points, flows, hexMeta
  usePoints.js      point CRUD, clusterIds (gridDisk), allClaimedHexIds, overlapPairs
  useDuckDB.js      initDB / loadYear / queryOD — DuckDB-WASM MVPBundle
  useFlows.js       drives DuckDB on points/year/kRing change → ODFlow[], MatrixCell[]
  MapView.jsx       MapLibre map, AGRC basemap, click handler, markers
    HexLayer.jsx    GeoJSON fill layer for selected clusters
    FlowLayer.jsx   Flowmap.gl arc layer, arc hover tooltip
  ODMatrix.jsx      N×N OD table, colour-coded, hover tooltip
  PointList.jsx     sidebar: names, colours, county, reorder, delete, overlap warning
```

## Deployment

Push to `main` → GitHub Actions runs `npm ci && npm run build` → deploys `dist/` to
`gh-pages` branch automatically. Pipeline scripts are never run in CI.
