# Quickstart & Validation Guide: Commute Flow Explorer

**Feature**: 001-commute-flow-explorer
**Date**: 2026-06-25

---

## Prerequisites

- Node.js 20+
- Python 3.11+ with `uv` installed (`pip install uv` or via official installer)
- Git with Git LFS (`git lfs install`)
- A modern browser (Chrome, Firefox, or Edge — latest stable)

---

## 1. Pipeline Setup (one-time, or after LODES update)

```bash
cd scripts

# Install Python dependencies
uv sync

# Download and filter LODES OD data (all years, all active counties)
uv run download_lodes.py

# Download WAC industry data
uv run download_wac.py

# Download block geography crosswalk
uv run download_crosswalk.py

# Build H3 hex metadata
uv run build_hex_meta.py

# Build per-year OD Parquet files
uv run build_od_parquet.py
```

Expected output of `build_od_parquet.py` (per year):
```
od_2023.parquet: 1,234,567 hex-pairs, 18,450,000 total commuters, 22.4 MB
```

Parquet files appear in `../public/data/`.

---

## 2. Dev Server

```bash
cd ..   # back to repo root
npm install
npm run dev
```

Open `http://localhost:5173` in a browser.

---

## Validation Scenarios

### VS-001: Map Loads with Utah AGRC Basemap

**Steps**:
1. Open `http://localhost:5173`.
2. Observe the map.

**Expected**: Map renders centred on the Wasatch Front (~Salt Lake City area) at zoom 9.
Three layer groups visible: terrain shading (VectorHillshade), road/land polygons (LiteBase),
place labels (LiteLabels). No API key prompt. Console shows no 401/403 errors.

**Fallback check**: Temporarily block `tiles.arcgis.com` in browser DevTools → Network.
Expected: map falls back to OpenFreeMap Liberty style.

---

### VS-002: Point Selection & Hex Cluster

**Steps**:
1. Click anywhere over Salt Lake City on the map.
2. Observe sidebar and map.

**Expected**:
- "Point 1" appears in the Points List with a colour dot and county name (e.g. "Salt Lake County").
- 7 hexagons (k=1 ring) are highlighted in that point's colour on the map.
- Empty-state prompt disappears.
- A numbered pin marker appears at the click location.

---

### VS-003: OD Flow Arcs (P1)

**Steps**:
1. Add Point 1 (downtown SLC area).
2. Add Point 2 (airport area, well separated from Point 1).
3. Observe arcs.

**Expected**:
- Bidirectional arcs appear between the two cluster centroids.
- Arc colour is on the GnBu scale (light green-blue for lower volumes, darker blue for higher).
- Sidebar shows "Total commuters: N,NNN".
- Hovering an arc shows a tooltip with: "Point 1 → Point 2", total commuters, SA01/SA02/SA03
  counts and percentages, SI01/SI02/SI03 counts and percentages, and the industry attribution note.

---

### VS-004: OD Matrix View

**Steps**:
1. Add 3 non-overlapping points.
2. Click "Matrix view" in the toolbar.

**Expected**:
- Full-screen N×N table appears with rows = origins, columns = destinations.
- Non-zero cells are colour-coded (darker = higher volume).
- Zero-flow cells display `—` with no fill.
- Last column and last row show bold totals.
- Hovering a non-zero cell shows the same tooltip format as arc hover.

---

### VS-005: Ring Size & Overlap Warning

**Steps**:
1. Click two locations that are close together (within ~500m in downtown SLC).
2. Observe the overlap warning.
3. Change Ring size from 1 to 0.

**Expected**:
- After step 1 with k=1: a yellow warning banner appears listing the overlapping point pair.
  Shared hex cells show a hatched or dual-colour fill.
- After step 3 with k=0: warning disappears (if overlap is resolved); each point shows a
  single hex cell; DuckDB re-queries immediately.

---

### VS-006: Year Switch & COVID Warning

**Steps**:
1. Select 2 points with visible flows.
2. Change year to 2020 in the Year selector.
3. Observe the badge.

**Expected**:
- A COVID disruption warning badge appears near the year selector.
- Arc and matrix data updates to 2020 flows.
- Change to 2023: badge disappears.

---

### VS-007: Point Rename & Reorder

**Steps**:
1. Select 2+ points.
2. Click ✎ on "Point 1" and rename to "Downtown SLC".
3. Click ↓ on "Downtown SLC" to move it down one position.

**Expected**:
- Arc tooltip origin label updates to "Downtown SLC".
- Matrix row/column headers update to "Downtown SLC".
- After reorder, matrix column order reflects the new position.

---

### VS-008: Reject Claimed Cell

**Steps**:
1. Add Point 1 (k=1, 7 cells claimed).
2. Click directly on one of Point 1's cluster hexes.

**Expected**:
- No new point is created.
- A tooltip reads: "Already in selection — try spacing points further apart or reducing Ring size."

---

## 3. Production Build Verification

```bash
npm run build
npx serve dist
```

Open `http://localhost:3000`. Run through VS-001 to VS-008 on the production build.

Check browser console: no 404 errors for Parquet or WASM files. Network tab should show
`od_2023.parquet` loaded on first query only (subsequent year switches use cached responses).

---

## 4. GitHub Pages Deploy Check

After pushing to `main`:
1. GitHub Actions runs `npm ci && npm run build`.
2. `dist/` is published to `gh-pages` branch.
3. Open the Pages URL and confirm VS-001 (basemap loads) and VS-003 (arcs load for 2023).
