<!--
Sync Impact Report
Version change: (template) → 1.0.0
Added sections: All (initial ratification)
Templates updated: plan-template.md ✅, spec-template.md ✅, tasks-template.md ✅
Follow-up TODOs: none
-->

# Commute Flow Explorer Constitution

## Core Principles

### I. Serverless-First (NON-NEGOTIABLE)

The application MUST run entirely as static files with no server-side computation. All data
processing happens either in the Python pre-processing pipeline (run locally, artefacts
committed) or in the browser (DuckDB-WASM). No Express/Node/FastAPI/Lambda backend is
permitted. GitHub Pages is the only permitted hosting target. Any feature that requires a
server-side endpoint is out of scope.

### II. Data Fidelity

LODES OD data MUST be reproduced accurately. Count columns (S000, SA01, SA02, SA03, SI01,
SI02, SI03) MUST never be smoothed, interpolated, or approximated. Wage and industry
breakdowns MUST be clearly labelled with their source column names in the UI. The pipeline
MUST sum block-pair flows to hex-pairs — not average or weight them. Any join that
introduces NULL values for missing blocks MUST default to 0, not be dropped silently.

### III. Config-Driven Geography

County selection MUST live exclusively in `scripts/counties.yaml`. No county FIPS code,
county name, or state abbreviation MUST appear as a hardcoded literal anywhere in
application code, pipeline scripts, or query logic. Adding a new county MUST require only
editing `counties.yaml` and re-running the pipeline — zero application code changes.

### IV. Spatial Precision Contract

H3 resolution 9 is fixed across the entire stack. The pipeline MUST store Parquet at
resolution 9. The browser MUST resolve clicks at resolution 9. K-ring expansion (k=0..3)
MUST happen only at query time in the browser — never baked into Parquet. The constant
`H3_RESOLUTION = 9` in `scripts/config.py` MUST match the constant in `src/utils/h3Utils.js`.
Deviating from resolution 9 requires updating both and re-running the full pipeline.

### V. Performance Guardrails

- Each `od_{year}.parquet` file MUST be lazy-loaded only when first queried for that year.
  The browser cache is relied upon for subsequent year switches — no pre-fetching.
- DuckDB `IN` clause queries over realistic point selections (≤20 points × k=3 = 740 hex
  IDs) MUST complete in under 2 seconds on a modern laptop.
- Parquet files exceeding 50 MB MUST use Git LFS. The pipeline MUST warn at 90 MB.
- `hex_meta.parquet` MUST be loaded once at startup into a JS `Map` — never re-fetched
  per interaction.

### VI. Minimal Dependency Surface

Only the libraries listed in SPEC.md are permitted:
- **Frontend**: Vite, React, MapLibre GL JS, h3-js, Flowmap.gl, @duckdb/duckdb-wasm
- **Pipeline**: pandas, pyarrow, h3 (≥4.0), pyyaml, requests, tqdm

MapLibre GL Draw, Turf.js, and any polygon-draw library are explicitly forbidden.
New dependencies require explicit justification against this constitution.

### VII. Accessibility & Colour

All interactive elements (matrix cells, arc hovers, point list controls) MUST be keyboard-
reachable. Colour scales MUST remain distinguishable under deuteranopia (the GnBu ramp
and the categorical point palette MUST be tested against a colour-blindness simulator before
release). Zero-flow matrix cells MUST display `—` rather than `0` or a filled colour.

## Deployment Constraints

- **Deterministic builds**: Parquet files are committed artefacts. The pipeline is never run
  in CI. GitHub Actions only runs `npm ci && npm run build`.
- **Git LFS**: Any Parquet file ≥ 50 MB MUST be tracked with Git LFS before committing.
- **No secrets**: No API keys are required. The Utah AGRC tile services are open. If AGRC
  is unavailable, the fallback is OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`).
- **COVID warning**: Years 2020 and 2021 reflect COVID disruption. The UI MUST display a
  visible warning badge when either year is selected.

## Development Workflow

- All pipeline scripts live in `scripts/`. All frontend source lives in `src/`.
- Pre-processing is run locally by a developer, never in CI.
- The `public/data/` directory contains only the pre-processed Parquet artefacts — no raw
  LODES CSVs are committed.
- Feature branches follow `NNN-short-name` naming (e.g. `001-commute-flow-explorer`).
- Pull requests must verify all Constitution Check gates before merge.

## Governance

This constitution supersedes all other project conventions. Amendments require:
1. A written rationale explaining why the principle must change.
2. A migration plan for existing code that violates the new principle.
3. Version bump per semantic versioning rules (MAJOR for removals/redefinitions,
   MINOR for additions, PATCH for clarifications).

All implementation tasks MUST reference the constitution principle they satisfy in the
task description. Any complexity beyond what is strictly required by the spec MUST be
documented in the Complexity Tracking table of the plan.

Use `CLAUDE.md` for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
