"""Build od_{year}.parquet files — one per LODES year."""
import io
import gzip
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path
from tqdm import tqdm
from config import YEARS, ACTIVE_STATES, CACHE_DIR, OUTPUT_DIR

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

lookup = pd.read_parquet(CACHE_DIR / "block_h3_lookup.parquet",
                         columns=["geoid", "h3_id"])
lookup = lookup.set_index("geoid")["h3_id"].to_dict()

hex_meta = pd.read_parquet(OUTPUT_DIR / "hex_meta.parquet",
                           columns=["h3_id", "lon", "lat"])
hex_meta = hex_meta.set_index("h3_id")

COUNT_COLS = ["S000", "SA01", "SA02", "SA03"]
SI_COLS    = ["SI01", "SI02", "SI03"]

for year in tqdm(YEARS, desc="Building OD Parquet"):
    out_path = OUTPUT_DIR / f"od_{year}.parquet"
    if out_path.exists():
        print(f"  {year}: already exists, skipping")
        continue

    od_parts = []
    for state in ACTIVE_STATES:
        od_file = CACHE_DIR / "od" / f"{state}_od_{year}.csv.gz"
        if not od_file.exists():
            continue
        df = pd.read_csv(od_file, dtype=str)
        od_parts.append(df)

    if not od_parts:
        print(f"  {year}: no OD data found, skipping")
        continue

    od = pd.concat(od_parts, ignore_index=True)
    od = od.drop_duplicates(subset=["h_geocode", "w_geocode"])

    # Map blocks to H3 IDs
    od["h_h3"] = od["h_geocode"].map(lookup)
    od["w_h3"] = od["w_geocode"].map(lookup)
    od = od.dropna(subset=["h_h3", "w_h3"])

    for col in COUNT_COLS:
        od[col] = pd.to_numeric(od[col], errors="coerce").fillna(0).astype(int)

    # Load WAC and join SI columns
    wac_parts = []
    for state in ACTIVE_STATES:
        wac_file = CACHE_DIR / "wac" / f"{state}_wac_{year}.csv.gz"
        if wac_file.exists():
            wac_parts.append(pd.read_csv(wac_file, dtype=str))
    if wac_parts:
        wac = pd.concat(wac_parts, ignore_index=True)
        for col in SI_COLS:
            if col in wac.columns:
                wac[col] = pd.to_numeric(wac[col], errors="coerce").fillna(0).astype(int)
            else:
                wac[col] = 0
        od = od.merge(wac[["w_geocode"] + SI_COLS], on="w_geocode", how="left")
    else:
        for col in SI_COLS:
            od[col] = 0

    for col in SI_COLS:
        od[col] = od[col].fillna(0).astype(int)

    # Aggregate to hex-pair level
    agg = (
        od.groupby(["h_h3", "w_h3"], as_index=False)[COUNT_COLS + SI_COLS]
        .sum()
    )
    agg = agg[agg["S000"] > 0]

    # Join centroids
    for prefix, col_name in [("h", "h_h3"), ("w", "w_h3")]:
        for coord in ["lon", "lat"]:
            agg[f"{prefix}_{coord}"] = (
                agg[col_name].map(hex_meta[coord]).astype("float32")
            )

    # Drop rows with missing centroids (hex not in hex_meta — shouldn't happen)
    agg = agg.dropna(subset=["h_lon", "h_lat", "w_lon", "w_lat"])

    # Cast types
    for col in COUNT_COLS + SI_COLS:
        agg[col] = agg[col].astype("int32")

    table = pa.Table.from_pandas(agg, preserve_index=False)
    pq.write_table(table, out_path, compression="snappy")

    size_mb = out_path.stat().st_size / 1_048_576
    total   = int(agg["S000"].sum())
    print(f"  {year}: {len(agg):,} hex-pairs, {total:,} commuters, {size_mb:.1f} MB")
    if size_mb > 90:
        print(f"  WARNING: {out_path.name} is {size_mb:.1f} MB — consider Git LFS")

print("Done.")
