# Tasks: Commute Flow Explorer

**Input**: Design documents from `specs/001-commute-flow-explorer/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

---

## Phase 1: Project Setup (Shared Infrastructure)

**Purpose**: Scaffold the Vite/React project, Python pipeline project, and CI/CD.

- [ ] T001 Initialise Vite React project: `npm create vite@latest . -- --template react` — creates `index.html`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`
- [ ] T002 Install frontend dependencies: `npm install maplibre-gl h3-js @flowmap.gl/core @duckdb/duckdb-wasm`
- [ ] T003 [P] Create `scripts/pyproject.toml` with pandas, pyarrow, h3≥4.0, pyyaml, requests, tqdm; run `uv sync`
- [ ] T004 [P] Create `scripts/counties.yaml` with 8 Wasatch Front county entries (Salt Lake 49035, Utah 49049, Davis 49011, Weber 49057, Tooele 49045, Summit 49043, Wasatch 49051, Morgan 49029)
- [ ] T005 [P] Create `scripts/config.py` loading `H3_RESOLUTION=9`, `YEARS=range(2002,2024)`, `ACTIVE_COUNTIES` and `ACTIVE_STATES` from `counties.yaml`
- [ ] T006 [P] Create `.gitattributes` with `*.parquet filter=lfs diff=lfs merge=lfs -text` and run `git lfs install`
- [ ] T007 [P] Create `.github/workflows/deploy.yml` — checkout with LFS, setup-node 20, npm ci, npm run build, peaceiris/actions-gh-pages@v4 publishing `./dist`
- [ ] T008 [P] Create `public/data/` directory (empty placeholder — populated by pipeline)
- [ ] T009 Configure `vite.config.js`: set `base` for GitHub Pages, exclude `@duckdb/duckdb-wasm` from Vite optimizeDeps, copy WASM assets to `dist/`

**Checkpoint**: `npm run dev` starts without errors; `uv run python -c "import h3; print(h3.__version__)"` prints 4.x

---

## Phase 2: Python Pipeline (Blocking Prerequisite for Real Data)

**Purpose**: Build all five pipeline scripts that produce the committed Parquet artefacts.
These scripts run locally before deployment — not in CI.

- [ ] T010 Create `scripts/download_lodes.py`: for each state in ACTIVE_STATES, download `main` and `aux` OD CSVs for all years; filter rows to ACTIVE_COUNTIES (h_geocode[:5] OR w_geocode[:5] in set); deduplicate main∪aux on (h_geocode, w_geocode); save to `.cache/od/`
- [ ] T011 [P] Create `scripts/download_wac.py`: download WAC S000 CSVs for each state/year; keep w_geocode, SI01, SI02, SI03; filter to ACTIVE_COUNTIES work blocks; save to `.cache/wac/`
- [ ] T012 [P] Create `scripts/download_crosswalk.py`: download `{state}_xwalk.csv.gz` for each state; extract tabblk2020/blklon/blklat/cty; filter to ACTIVE_COUNTIES; assign h3_id via `h3.latlng_to_cell(blklat, blklon, 9)`; save as `.cache/block_h3_lookup.parquet`
- [ ] T013 Create `scripts/build_hex_meta.py`: load block_h3_lookup; group by h3_id → plurality county (mode of county_fips); compute centroid via `h3.cell_to_latlng`; join county_name from counties.yaml; write `public/data/hex_meta.parquet`
- [ ] T014 Create `scripts/build_od_parquet.py`: for each year — load filtered OD CSV; join h3_id for h_geocode and w_geocode from block_h3_lookup; drop rows with missing H3; left-join WAC SI01/SI02/SI03 on w_geocode (fillna 0); group by (h_h3, w_h3) summing all count cols; join w_lon/w_lat/h_lon/h_lat from hex_meta; cast int32/float32; write `public/data/od_{year}.parquet` Snappy; print stats and warn if > 90 MB

**Checkpoint**: `uv run build_od_parquet.py` completes for year 2023; `public/data/od_2023.parquet` exists and is < 90 MB; `public/data/hex_meta.parquet` exists with county_name populated.

---

## Phase 3: User Story 1 — Point Selection & Hex Cluster Visualisation (Priority: P1) 🎯 MVP

**Goal**: A planner can click the map, see hex clusters highlighted, and manage the Points List.

**Independent Test**: Open app, click 2 locations → 2 coloured hex clusters visible, sidebar shows 2 named points with county names (VS-002).

### Foundation: Utilities & Hooks (no UI yet)

- [ ] T015 [P] [US1] Create `src/utils/h3Utils.js`: export `latLngToCell(lat, lng, res)`, `gridDisk(h3Id, k)`, `cellToBoundary(h3Id)` — thin wrappers around h3-js with GeoJSON coordinate order
- [ ] T016 [P] [US1] Create `src/utils/colors.js`: export `POINT_COLORS` array (12 categorical colours from data-model); export `flowColorScale(value, min, max)` returning GnBu hex; export `matrixColorScale(value, max)` returning white-teal hex
- [ ] T017 [P] [US1] Create `src/utils/countyConfig.js`: export `loadHexMeta()` that fetches `hex_meta.parquet`, parses it into a `Map<h3_id, {lon, lat, county_fips, county_name}>`, and exposes `getHexMeta(h3_id)`
- [ ] T018 [US1] Create `src/hooks/usePoints.js`: manage `points` array state — expose `addPoint({lat, lng, kRing})`, `deletePoint(id)`, `renamePoint(id, name)`, `reorderPoint(id, direction)`, `allClaimedHexIds` (Set), `pointClusters` (Map<id, Set<h3_id>>), `overlapPairs` (Array<[id,id]>)

### UI: MapView & PointList

- [ ] T019 [US1] Create `src/utils/agrcStyle.js`: `resolveAGRCStyle(styleUrl)` fetches JSON, rewrites `sprite`/`glyphs`/tile URL relative paths to absolute; `buildMergedAGRCStyle()` fetches all three AGRC styles and merges sources+layers in order (VectorHillshade → LiteBase → LiteLabels) with prefixed source keys; falls back to OpenFreeMap if any fetch fails
- [ ] T020 [US1] Create `src/components/MapView.jsx`: initialise MapLibre map with merged AGRC style; set initial view `{center: [-111.89, 40.55], zoom: 9}`; expose `onMapClick` handler via prop; render numbered MapLibre Marker elements at each point's lat/lng
- [ ] T021 [US1] Create `src/components/HexLayer.jsx`: maintain a MapLibre `fill` source (`hex-clusters`) updated on points change; each feature has `h3Id` and `pointColor` properties; apply `fill-color: ['get', 'pointColor']`, `fill-opacity: 0.4`; for overlapping cells apply a hatched pattern or secondary colour
- [ ] T022 [US1] Create `src/components/PointList.jsx`: render ordered list of points with colour dot, editable name (✎ inline input with duplicate-name validation), county name, ↑/↓ reorder buttons, × delete button; show "Click anywhere on the map to add a point." when list is empty; show yellow overlap warning banner listing overlapping pairs when `overlapPairs.length > 0`
- [ ] T023 [US1] Create `src/App.jsx`: compose MapView + HexLayer + PointList; wire `usePoints`; pass `onMapClick` to MapView; load hexMeta on mount; implement click handler — compute rootH3, check claimed, compute clusterIds, check overlap, call addPoint

**Checkpoint** (VS-001, VS-002, VS-008): Map loads with AGRC basemap; clicking adds hex cluster; duplicate clicks show tooltip; overlap warning shows for close points.

---

## Phase 4: User Story 2 — OD Flow Query & Arc Visualisation (Priority: P1)

**Goal**: With 2+ points, DuckDB queries flows and Flowmap.gl renders bidirectional arcs with hover tooltips.

**Independent Test**: 2 points → arcs visible → hover shows breakdown tooltip → year change updates arcs (VS-003, VS-006).

- [ ] T024 [US2] Create `src/hooks/useDuckDB.js`: implement `initDB()`, `loadYear(year)`, `queryOD(allHexIds)` per the DuckDB query contract; track `currentYear` to avoid redundant view recreations; handle DuckDB-WASM MVPBundle initialisation with correct worker URL
- [ ] T025 [US2] Create `src/hooks/useFlows.js`: subscribe to `points`, `year`, `kRing`; call `loadYear` then `queryOD` on change; map raw ODRow results to `MatrixCell` aggregations (group by originPointId × destPointId by iterating pointClusters membership); return `{ flows, matrixCells, totalCommuters }`
- [ ] T026 [US2] Create `src/components/FlowLayer.jsx`: Flowmap.gl arc layer wrapper; accepts `flows` (array of {from: {lon,lat}, to: {lon,lat}, value: S000, ...full wage+industry row}); colour arcs by S000 on GnBu scale; handle bidirectional offset; handle self-loops as ring indicators; expose `onArcHover` for tooltip
- [ ] T027 [US2] Wire `useFlows` into `App.jsx`; pass `flows` to `FlowLayer`; pass `totalCommuters` to sidebar headline
- [ ] T028 [US2] Add arc hover tooltip component in `MapView.jsx`: floating div positioned at mouse; shows "Origin → Destination", S000, SA01/SA02/SA03 with row percentages, SI01/SI02/SI03 with row percentages, industry attribution note
- [ ] T029 [US2] Add COVID warning badge in `YearSelector.jsx`: show ⚠ badge when selected year is 2020 or 2021

**Checkpoint** (VS-003, VS-006): Arcs appear for 2+ points; hover tooltip shows full breakdown; year change reloads Parquet and re-renders arcs; 2020/2021 shows COVID badge.

---

## Phase 5: User Story 3 — OD Matrix View (Priority: P2)

**Goal**: Full-screen matrix table replaces the map, showing colour-coded OD flows with totals and hover tooltips.

**Independent Test**: 3 points, switch to Matrix → N×N table, zero cells show `—`, hover shows tooltip (VS-004).

- [ ] T030 [US3] Create `src/components/ViewToggle.jsx`: "Map view" / "Matrix view" toggle buttons in the toolbar; controlled by `activeView` state in App
- [ ] T031 [US3] Create `src/components/ODMatrix.jsx`: render N×N table from `matrixCells` and `points` in list order; cell background from `matrixColorScale`; zero cells show `—`; bold totals row/column (sums per origin row and per destination column); hover tooltip reusing the same format as arc tooltip
- [ ] T032 [US3] Wire `activeView` into `App.jsx`: render `MapView`+`FlowLayer`+`HexLayer` OR `ODMatrix` based on toggle; both share the same `useFlows` result (no re-query on view toggle)

**Checkpoint** (VS-004): Matrix renders correctly; renaming/reordering points updates matrix headers immediately.

---

## Phase 6: User Story 4 — Ring Size & Year Controls (Priority: P2)

**Goal**: Toolbar dropdowns for Year and Ring size; changes immediately re-expand clusters and re-query.

**Independent Test**: k=0 eliminates overlap for close points; year change updates flows (VS-005, VS-007).

- [ ] T033 [US4] Create `src/components/YearSelector.jsx`: dropdown 2002–2023 with COVID badge for 2020/2021; controlled by `year` state in App
- [ ] T034 [US4] Create `src/components/CrossStateBadge.jsx`: renders county name badge next to each point (used by PointList); county name from hexMeta lookup on point's rootH3
- [ ] T035 [US4] Add Ring size selector to toolbar in `App.jsx`: dropdown 0/1/2/3 labelled "Ring size" with tooltip text from spec; on change, call `recomputeAllClusters(newK)` which updates every point's clusterIds via `gridDisk(rootH3, newK)` and triggers `useFlows` re-query
- [ ] T036 [US4] Implement `recomputeAllClusters` in `usePoints.js`: iterate all points, recompute `clusterIds = gridDisk(rootH3, k)`, recompute `allClaimedHexIds` and `overlapPairs`

**Checkpoint** (VS-005, VS-007): k=0 shrinks clusters to single cells; overlap warning clears; ring-size tooltip text matches spec wording.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, empty states, final wiring, and deployment readiness.

- [ ] T037 [P] Add keyboard navigation: all interactive elements (✎, ×, ↑, ↓, year selector, ring selector, view toggle, matrix cells) reachable and activatable via Tab + Enter/Space
- [ ] T038 [P] Add empty-state prompt in MapView: "Click anywhere on the map to add a point." overlaid when `points.length < 2` (centred on map, not blocking clicks)
- [ ] T039 [P] Add "Total commuters: N,NNN" headline in sidebar below PointList; updates on every `useFlows` result
- [ ] T040 [P] Add hex-cluster hover tooltip in MapView (MapLibre `mousemove` event on `hex-clusters` layer): shows point name, county, outbound total, inbound total
- [ ] T041 Verify colour palette passes deuteranopia check for both POINT_COLORS (categorical) and GnBu/teal scales; adjust if needed
- [ ] T042 [P] Create `CLAUDE.md` (update existing): document dev commands (`npm run dev`, `npm run build`), pipeline commands (`uv run download_lodes.py` etc.), the `counties.yaml` extension point, and link to `specs/001-commute-flow-explorer/plan.md`
- [ ] T043 Run `npm run build` and verify Parquet + WASM assets are present in `dist/`; open `npx serve dist` and run all VS-* validation scenarios from quickstart.md
- [ ] T044 [P] Commit all source files (excluding `.cache/` and raw CSVs); commit Parquet files via Git LFS; push to `main` and verify GitHub Actions deploy succeeds

**Checkpoint**: All VS-001 through VS-008 pass on both dev server and production build.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Pipeline)**: Depends on Phase 1 (needs `config.py`, `counties.yaml`)
- **Phase 3 (US1 map)**: Can start after Phase 1 complete; Phase 2 provides real data but mock/small Parquet works for dev
- **Phase 4 (US2 flows)**: Depends on Phase 3 (needs map + points wired)
- **Phase 5 (US3 matrix)**: Depends on Phase 4 (needs `matrixCells` from `useFlows`)
- **Phase 6 (US4 controls)**: Depends on Phase 3; Year selector needs DuckDB (Phase 4)
- **Phase 7 (Polish)**: Depends on Phases 3–6 complete

### Parallel Opportunities

- T003–T009 within Phase 1 (all marked [P])
- T010–T012 within Phase 2 (download scripts independent)
- T015–T018 within Phase 3 foundation (utilities + hook)
- T024–T025 within Phase 4 (DuckDB hook + flows hook)
- T037–T041, T042 within Phase 7 (all polish tasks independent)
