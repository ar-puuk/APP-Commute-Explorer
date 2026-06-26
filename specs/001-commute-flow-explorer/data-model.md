# Data Model: Commute Flow Explorer

**Feature**: 001-commute-flow-explorer
**Date**: 2026-06-25

---

## Static Parquet Artefacts (pre-processed, committed to repo)

### `public/data/hex_meta.parquet`

One row per populated H3 resolution-9 cell in the active county set.

| Column        | Type    | Description                                              |
|---------------|---------|----------------------------------------------------------|
| `h3_id`       | string  | H3 cell index, e.g. `"892a100d2bfffff"`                  |
| `lon`         | float32 | H3 cell centroid longitude                               |
| `lat`         | float32 | H3 cell centroid latitude                                |
| `state_fips`  | string  | 2-digit state FIPS of the plurality block in the cell    |
| `county_fips` | string  | 5-digit county FIPS of the plurality block               |
| `county_name` | string  | Human-readable county name from `counties.yaml`          |

**Loaded at startup** into a JS `Map<h3_id, {lon, lat, county_fips, county_name}>`.
Never re-fetched per interaction.

---

### `public/data/od_{year}.parquet` (one file per year, 2002–2023)

One row per unique (home hex, work hex) pair with non-zero flow in that year.

| Column  | Type    | Description                                                     |
|---------|---------|-----------------------------------------------------------------|
| `w_h3`  | string  | Work (destination) H3 cell index                                |
| `h_h3`  | string  | Home (origin) H3 cell index                                     |
| `S000`  | int32   | Total commuters (sum of all block-pair flows in this hex-pair)  |
| `SA01`  | int32   | Low-wage commuters (≤$1,250/month)                              |
| `SA02`  | int32   | Mid-wage commuters ($1,251–$3,333/month)                        |
| `SA03`  | int32   | High-wage commuters (>$3,333/month)                             |
| `SI01`  | int32   | Goods-producing industry jobs at destination (from WAC)         |
| `SI02`  | int32   | Trade, transport & utilities jobs at destination                |
| `SI03`  | int32   | Other services jobs at destination                              |
| `w_lon` | float32 | Work hex centroid longitude (pre-joined from hex_meta)          |
| `w_lat` | float32 | Work hex centroid latitude                                      |
| `h_lon` | float32 | Home hex centroid longitude                                     |
| `h_lat` | float32 | Home hex centroid latitude                                      |

**Invariants**:
- `S000 = SA01 + SA02 + SA03` (within rounding; LODES guarantees this)
- `SI01`, `SI02`, `SI03` reflect job types at the *work* hex (destination), not home
- Rows with `S000 = 0` are excluded (pipeline drops zero-flow pairs)
- `h_h3 = w_h3` is valid (within-hex self-commute)

---

## Client-Side Runtime Entities (JavaScript)

### `Point`

Represents a planner-selected analysis zone. Managed by `usePoints.js`.

```
Point {
  id:         string          // UUID, stable across renames
  name:       string          // editable, must be unique; default "Point N"
  color:      string          // CSS colour from categorical palette (index-driven)
  lat:        number          // clicked coordinate (WGS-84)
  lng:        number          // clicked coordinate (WGS-84)
  rootH3:     string          // h3_id of the clicked cell
  clusterIds: Set<string>     // gridDisk(rootH3, k) — recomputed on ring-size change
  countyName: string          // from hex_meta lookup on rootH3
}
```

**Validation rules**:
- `name` must be unique across all Points in the list; empty name is not permitted.
- `clusterIds` must not intersect with any other Point's `clusterIds` at the centre cell
  (`rootH3`) — ring overlap at non-centre cells is allowed (with warning).

---

### `PointCluster` (derived, not stored)

Computed on demand from the Points list; not persisted.

```
pointClusters: Map<pointId, Set<h3_id>>
allClaimedHexIds: Set<h3_id>   // union of all cluster cells
overlapPairs: Array<[pointId, pointId]>  // pairs sharing ≥1 cell
```

---

### `ODFlow` (query result row)

Returned by DuckDB-WASM; shaped by `useFlows.js` into the OD matrix and arc data.

```
ODFlow {
  h_h3:  string   // origin hex
  w_h3:  string   // destination hex
  h_lon: number
  h_lat: number
  w_lon: number
  w_lat: number
  S000:  number
  SA01:  number
  SA02:  number
  SA03:  number
  SI01:  number
  SI02:  number
  SI03:  number
}
```

---

### `MatrixCell` (derived)

Aggregated from ODFlow rows by `useFlows.js`. Maps a (originPointId, destPointId) pair.

```
MatrixCell {
  originPointId: string
  destPointId:   string
  S000:  number   // sum of all ODFlow.S000 where h_h3 ∈ origin.clusterIds AND w_h3 ∈ dest.clusterIds
  SA01:  number
  SA02:  number
  SA03:  number
  SI01:  number
  SI02:  number
  SI03:  number
}
```

**Note on shared cells**: When two clusters overlap, a flow whose h_h3 belongs to both
clusters is counted in both corresponding MatrixCell rows. This is expected and documented
in the overlap warning.

---

## Pipeline Intermediate Artefacts (build-time only, not committed)

### `scripts/.cache/block_h3_lookup.parquet`

| Column       | Type   | Description                                            |
|--------------|--------|--------------------------------------------------------|
| `geoid`      | string | Block GEOID (`tabblk2020`)                             |
| `h3_id`      | string | H3 resolution-9 cell containing this block's centroid  |
| `blklon`     | float  | Block internal point longitude (from xwalk)            |
| `blklat`     | float  | Block internal point latitude                          |
| `state_fips` | string | 2-digit state FIPS                                     |
| `county_fips`| string | 5-digit county FIPS                                    |

Used by `build_od_parquet.py` and `build_hex_meta.py`; not shipped to the browser.

### `scripts/.cache/od/{state}_od_{type}_{year}.csv.gz` (filtered)
### `scripts/.cache/wac/{state}_wac_S000_JT00_{year}.csv.gz` (filtered)

Raw LODES downloads filtered to active counties. Not committed.

---

## Colour Palette

### Point colours (categorical, per-point)

Up to 12 distinct colours assigned by insertion index. Must be distinguishable under
deuteranopia. Suggested palette: `['#4e79a7','#f28e2b','#76b7b2','#59a14f','#edc948',
'#b07aa1','#ff9da7','#9c755f','#bab0ac','#e15759','#499894','#86bcb6']`

### Flow arc colour (sequential GnBu, by S000)

Linear scale from min(S000) → max(S000) across the current result set.
Colour stops: `['#f7fcf0','#ccebc5','#7bccc4','#2b8cbe','#084081']`

### OD matrix cell colour (sequential white → dark teal)

Linear scale from 0 → max(MatrixCell.S000) across current matrix.
Colour stops: `['#ffffff','#b2e2e2','#66c2a4','#2ca25f','#006d2c']`
