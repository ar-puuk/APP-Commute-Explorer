# Contract: DuckDB-WASM Query API

**Feature**: 001-commute-flow-explorer
**Date**: 2026-06-25

This contract defines the interface between the React application layer and DuckDB-WASM,
as implemented in `src/hooks/useDuckDB.js`.

---

## Exported Functions

### `initDB() → Promise<void>`

Initialises the DuckDB-WASM database using the MVPBundle. Must be called once before any
other function. Idempotent — subsequent calls are no-ops if already initialised.

**Side effects**: Creates an in-memory DuckDB instance and opens a connection.

**Errors**: Throws if the WASM bundle cannot be loaded (network failure or missing file).

---

### `loadYear(year: number) → Promise<void>`

Registers a view for the specified year's Parquet file.

```sql
CREATE OR REPLACE VIEW od AS
SELECT * FROM parquet_scan('/data/od_<year>.parquet')
```

**Caching behaviour**: The Parquet file is fetched only once per browser session (browser
HTTP cache). Subsequent calls to `loadYear` with the same year are no-ops (tracked by
`currentYear` module variable).

**Errors**: Throws if the Parquet file cannot be fetched (404, network failure).

---

### `queryOD(allHexIds: string[]) → Promise<ODRow[]>`

Executes the OD flow query for the given set of hex IDs.

**Input**: Flat array of unique H3 cell ID strings — the union of all selected point clusters.

**SQL executed**:
```sql
SELECT
  h_h3, w_h3,
  h_lon, h_lat, w_lon, w_lat,
  S000, SA01, SA02, SA03, SI01, SI02, SI03
FROM od
WHERE h_h3 IN (<list>)
  AND w_h3 IN (<list>)
```

**Output**: Array of `ODRow` objects:

```typescript
interface ODRow {
  h_h3:  string;
  w_h3:  string;
  h_lon: number;
  h_lat: number;
  w_lon: number;
  w_lat: number;
  S000:  number;
  SA01:  number;
  SA02:  number;
  SA03:  number;
  SI01:  number;
  SI02:  number;
  SI03:  number;
}
```

**Returns all flows** where both origin AND destination cells are anywhere in `allHexIds`,
including self-loops (`h_h3 === w_h3`).

**Preconditions**:
- `initDB()` must have been called.
- `loadYear(year)` must have been called for the current year before `queryOD`.

**Performance constraint**: Must complete in ≤ 2 s for `allHexIds.length ≤ 740`
(20 points × 37 cells at k=3).

---

## Security Note

The `allHexIds` array MUST be constructed only from validated H3 cell IDs returned by
`h3-js`. Never concatenate raw user-typed strings into the SQL IN clause.

---

## `hex_meta` Lookup (not DuckDB — loaded separately)

`hex_meta.parquet` is NOT queried via DuckDB at runtime. It is fetched once at app startup,
parsed with a lightweight Arrow/Parquet reader or fetched as a pre-converted JSON, and stored
as a `Map<string, HexMeta>` in module state.

```typescript
interface HexMeta {
  lon:         number;
  lat:         number;
  county_fips: string;
  county_name: string;
}
```

The `countyConfig.js` utility manages this map and exposes `getHexMeta(h3_id): HexMeta | undefined`.
