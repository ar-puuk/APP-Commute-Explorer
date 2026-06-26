"""Build hex_meta.parquet — one row per populated H3 resolution-9 cell."""
import h3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from config import CACHE_DIR, OUTPUT_DIR, COUNTY_NAMES

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

lookup = pd.read_parquet(CACHE_DIR / "block_h3_lookup.parquet")

# Plurality county per hex (mode of county_fips across all blocks in the cell)
meta = (
    lookup.groupby("h3_id")["county_fips"]
    .agg(lambda x: x.mode().iloc[0])
    .reset_index()
    .rename(columns={"county_fips": "county_fips"})
)

state_meta = (
    lookup.groupby("h3_id")["state_fips"]
    .agg(lambda x: x.mode().iloc[0])
    .reset_index()
)
meta = meta.merge(state_meta, on="h3_id")

# H3 centroid coordinates
meta[["lat", "lon"]] = meta["h3_id"].apply(
    lambda h: pd.Series(h3.cell_to_latlng(h))
)
meta["lon"] = meta["lon"].astype("float32")
meta["lat"] = meta["lat"].astype("float32")

meta["county_name"] = meta["county_fips"].map(COUNTY_NAMES).fillna("Unknown")

meta = meta[["h3_id", "lon", "lat", "state_fips", "county_fips", "county_name"]]

out_path = OUTPUT_DIR / "hex_meta.parquet"
table = pa.Table.from_pandas(meta, preserve_index=False)
pq.write_table(table, out_path, compression="snappy")

size_mb = out_path.stat().st_size / 1_048_576
print(f"hex_meta.parquet: {len(meta):,} H3 cells, {size_mb:.1f} MB → {out_path}")
