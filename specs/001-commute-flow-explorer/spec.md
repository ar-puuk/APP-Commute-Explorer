# Feature Specification: Commute Flow Explorer

**Feature Branch**: `001-commute-flow-explorer`

**Created**: 2026-06-25

**Status**: Draft

**Source**: Derived from `SPEC.md` — Commuter Flow Explorer, Utah + Border Counties Edition

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Point Selection & Hex Cluster Visualisation (Priority: P1)

A transport planner opens the app, sees a map centred on the Wasatch Front, and clicks two or
more locations to define analysis zones. Each click snaps to an H3 resolution-9 hexagon and
expands it to a configurable k-ring cluster. The selected clusters are highlighted on the map
in distinct colours. The planner can rename each point, reorder the list, and delete points.

**Why this priority**: Without point selection there is no analysis at all. Every other user
story depends on at least two points being selected.

**Independent Test**: Open the app, click two locations. Verify two coloured hex clusters
appear on the map, a two-item Points List appears in the sidebar, and the county name is
shown under each point label.

**Acceptance Scenarios**:

1. **Given** the app is open with an empty Points List, **When** the planner clicks anywhere
   on the map, **Then** the H3 res-9 cell at that coordinate is computed, its k=1 ring (7
   cells) is highlighted in a unique colour, and "Point 1" appears in the sidebar with the
   county name.
2. **Given** one point is selected, **When** the planner clicks a second non-overlapping
   location, **Then** "Point 2" appears in a different colour and no overlap warning is shown.
3. **Given** two points whose k=1 rings share at least one cell, **When** the second point is
   added, **Then** a yellow warning banner names the overlapping pair and the shared cells are
   rendered with a hatched or dual-colour fill.
4. **Given** the planner clicks on a hex cell already claimed by an existing point's k-ring,
   **When** the click occurs, **Then** a tooltip reads "Already in selection — try spacing
   points further apart or reducing Ring size" and no new point is created.
5. **Given** a point in the list, **When** the planner clicks ✎ and types a new name, **Then**
   the name updates in the sidebar and in all OD matrix headers immediately; duplicate names
   show a validation error.
6. **Given** a point in the list, **When** the planner clicks ×, **Then** the point and its
   hex cluster are removed and flows update immediately.

---

### User Story 2 — OD Flow Query & Arc Visualisation (Priority: P1)

With two or more points selected, the app automatically queries DuckDB-WASM for commuter
flows between every pair of selected clusters and renders bidirectional arcs on the map
weighted by total commuter volume.

**Why this priority**: The core product value is seeing flows between zones. Tied P1 with
point selection because neither delivers value without the other.

**Independent Test**: Select two well-separated points. Verify that arcs appear between the
cluster centroids, that hovering an arc shows a tooltip with total commuters plus wage and
industry breakdowns, and that switching the year dropdown redraws the arcs for the new year.

**Acceptance Scenarios**:

1. **Given** 2+ points are selected, **When** the flow query completes, **Then** bidirectional
   arcs appear between all cluster-centroid pairs, coloured on a GnBu scale from low (light)
   to high (dark) by S000.
2. **Given** arcs are visible, **When** the planner hovers an arc, **Then** a tooltip appears
   showing origin → destination, total commuters, low/mid/high-wage counts with percentages,
   goods/trade/services industry counts with percentages, and the note "Industry reflects job
   type at destination".
3. **Given** arcs are visible, **When** the planner changes the year selector, **Then** the
   Parquet for the new year is fetched (or served from browser cache), DuckDB re-queries, and
   arcs update to reflect the new year's flows.
4. **Given** year 2020 or 2021 is selected, **When** the year is displayed, **Then** a visible
   COVID-disruption warning badge appears near the year selector.
5. **Given** 0 or 1 points selected, **When** viewing the map, **Then** no arcs are shown and
   an empty-state prompt reads "Click anywhere on the map to add a point."

---

### User Story 3 — OD Matrix View (Priority: P2)

The planner can switch to a full-screen OD matrix table that shows commuter volumes for every
origin–destination pair of selected points, with colour coding, totals, and hover tooltips
that match the arc tooltips.

**Why this priority**: Adds a structured numerical view on top of the map visualisation.
Delivers significant analytical value but the map view alone is sufficient for an MVP.

**Independent Test**: Select 3 points, switch to Matrix view. Verify the N×N table renders
with correct row/column headers (point names), colour-coded cells, `—` for zero flows, bold
totals row/column, and that hovering any cell shows the same breakdown as the arc tooltip.

**Acceptance Scenarios**:

1. **Given** 2+ points are selected, **When** the planner clicks "Matrix view", **Then** a
   full-screen N×N table replaces the map with rows = origins and columns = destinations in
   Points List order.
2. **Given** the matrix is displayed, **When** inspecting cells, **Then** non-zero cells are
   colour-coded on a white-to-dark-teal sequential scale normalised to the maximum cell value;
   zero cells show `—` with no fill.
3. **Given** the matrix is displayed, **When** the planner hovers any non-zero cell, **Then**
   a tooltip appears with origin → destination and the full wage + industry breakdown.
4. **Given** a point is renamed or reordered, **When** viewing the matrix, **Then** headers
   update immediately to reflect the new name/order.
5. **Given** the matrix is displayed, **When** viewing totals, **Then** the rightmost column
   shows row totals (total outbound per origin) and the bottom row shows column totals (total
   inbound per destination), both in bold and not colour-coded.

---

### User Story 4 — Ring Size & Year Controls (Priority: P2)

The planner can adjust the global k-ring size (0–3) and the data year (2002–2023) using
toolbar controls. Both changes immediately re-expand clusters and re-query DuckDB.

**Why this priority**: Ring size control is essential for managing overlap in dense areas.
Year selection allows temporal comparison. Both are toolbar-level controls that enhance all
other user stories.

**Independent Test**: Select two close points at k=1 that overlap. Set k=0. Verify the
overlap warning disappears, clusters shrink to single cells, and flows update. Then change
year and verify flows update again.

**Acceptance Scenarios**:

1. **Given** Ring size is set to k=1 (default), **When** the planner changes it to k=0, **Then**
   all cluster cells shrink to single hexagons, any prior overlap warnings clear (if overlap
   is resolved), and DuckDB re-queries immediately.
2. **Given** Ring size k=3, **When** two points are selected, **Then** each cluster shows 37
   cells on the map.
3. **Given** the Ring size tooltip is hovered, **Then** it reads: "Number of H3 rings around
   each clicked cell. k=0: single cell (~0.11 km²). k=1: 7 cells, ~census tract (default).
   k=2: 19 cells. k=3: 37 cells."
4. **Given** any year 2002–2023 is selected, **When** the year changes, **Then** the correct
   year's Parquet is queried and all arc and matrix data reflects that year.

---

### Edge Cases

- What happens when two k-ring clusters fully overlap (same clicked cell)? The second click
  is treated as "already in selection" and rejected with a tooltip.
- What happens if the AGRC tile server is unreachable? The basemap falls back to OpenFreeMap.
- What happens if a Parquet file exceeds the browser's memory? The pipeline warns at 90 MB;
  resolution 9 files are expected to stay under 60 MB.
- What happens for years 2020–2021? A visible COVID warning badge appears; data is still
  shown.
- What if `hex_meta` lookup returns no county for a clicked hex? The county field shows
  "Unknown county" — this should not occur for any hex in the committed Parquet.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST resolve any map click to an H3 resolution-9 cell using `h3-js` `latLngToCell`.
- **FR-002**: System MUST expand each clicked cell to a k-ring cluster using `h3-js` `gridDisk`, where k is the global ring-size setting (default 1).
- **FR-003**: System MUST detect and display an overlap warning when two clusters share any cells.
- **FR-004**: System MUST reject a click whose centre cell is already claimed by an existing cluster (show tooltip).
- **FR-005**: System MUST query DuckDB-WASM for OD flows using a single `IN`-clause query over the union of all selected cluster cells, returning S000, SA01, SA02, SA03, SI01, SI02, SI03.
- **FR-006**: System MUST render bidirectional Flowmap.gl arcs between cluster centroids, coloured by S000 on GnBu scale.
- **FR-007**: System MUST render arc hover tooltips with total commuters plus full wage and industry breakdown with percentages.
- **FR-008**: System MUST render H3 hex cluster fills on the MapLibre map in per-point categorical colours.
- **FR-009**: System MUST render the Utah AGRC basemap (VectorHillshade + LiteBase + LiteLabels) by fetching and merging the three style JSONs with relative URLs resolved to absolute.
- **FR-010**: System MUST fall back to OpenFreeMap if AGRC styles are unreachable.
- **FR-011**: System MUST display a county name below each point in the Points List, looked up from `hex_meta.parquet`.
- **FR-012**: System MUST allow inline rename of any point; duplicate names MUST show a validation error.
- **FR-013**: System MUST allow reorder (↑/↓) and delete (×) of any point, with immediate flow and matrix updates.
- **FR-014**: System MUST provide an N×N OD matrix view with colour-coded cells, `—` for zeros, and bold totals.
- **FR-015**: System MUST show OD matrix hover tooltips matching the arc tooltip format.
- **FR-016**: System MUST display a "Total commuters" headline count in the sidebar panel.
- **FR-017**: System MUST support a year selector (2002–2023) that lazy-loads the selected year's Parquet on first use.
- **FR-018**: System MUST support a ring-size selector (k=0,1,2,3) with a descriptive tooltip.
- **FR-019**: System MUST show a COVID warning badge when year 2020 or 2021 is selected.
- **FR-020**: System MUST display an empty-state prompt when fewer than 2 points are selected.

### Key Entities

- **Point**: A planner-selected analysis zone. Has an ID, display name (editable), colour, clicked coordinate, root H3 cell, and k-ring cluster (set of H3 cell IDs).
- **Cluster**: The set of H3 resolution-9 cells in a point's k-ring. Computed client-side on click or ring-size change.
- **OD Flow**: A hex-pair row from the Parquet: `(h_h3, w_h3, S000, SA01, SA02, SA03, SI01, SI02, SI03, h_lon, h_lat, w_lon, w_lat)`. Queried at runtime from DuckDB-WASM.
- **Hex Metadata**: `hex_meta.parquet` row — `(h3_id, lon, lat, county_fips, county_name)`. Loaded once at startup.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A planner can click two points and see commuter flow arcs in under 3 seconds on a 10 Mbps connection (including Parquet download for first query of a given year).
- **SC-002**: Switching between years that are already cached completes flow re-render in under 1 second.
- **SC-003**: The OD matrix correctly displays all N×N cells with zero cells showing `—` and non-zero cells colour-coded relative to the maximum.
- **SC-004**: The app loads and renders the Utah AGRC basemap without an API key in a modern browser (Chrome, Firefox, Edge latest).
- **SC-005**: Adding a county to `counties.yaml` and re-running the pipeline requires zero changes to application source code.
- **SC-006**: All interactive controls are reachable via keyboard alone (no mouse required for point rename, delete, reorder, year/ring selectors, view toggle).

---

## Assumptions

- Planners use a modern desktop browser (Chrome, Firefox, or Edge, latest stable version). Mobile is out of scope for v1.
- The Python pipeline is run locally by a developer before deployment; raw LODES CSV files are not committed.
- `public/data/` Parquet files are committed to the repository (via Git LFS for files ≥ 50 MB) and served as static assets.
- The Utah AGRC vector tile services remain publicly accessible; OpenFreeMap is used only as a fallback.
- No authentication or user accounts are required.
- The maximum number of analysis points a planner will select in one session is ~20.
- LODES years 2002–2023 are all pre-processed and available as Parquet files; no live LODES API calls are made from the browser.
