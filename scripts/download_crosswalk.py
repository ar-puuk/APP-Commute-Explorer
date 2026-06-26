"""Download LODES geography crosswalk and assign H3 resolution-9 cell IDs."""
import io
import gzip
import requests
import pandas as pd
import h3
from config import LODES_BASE, ACTIVE_STATES, ACTIVE_COUNTIES, CACHE_DIR, H3_RESOLUTION

CACHE_DIR.mkdir(parents=True, exist_ok=True)
ACTIVE_SET = set(ACTIVE_COUNTIES)

all_blocks = []

for state in ACTIVE_STATES:
    url = f"{LODES_BASE}/{state}/{state}_xwalk.csv.gz"
    print(f"Downloading {url}")
    r = requests.get(url, timeout=180)
    r.raise_for_status()

    df = pd.read_csv(io.BytesIO(gzip.decompress(r.content)), dtype=str,
                     usecols=["tabblk2020", "blklondd", "blklatdd", "cty"])

    df = df[df["cty"].isin(ACTIVE_SET)].copy()
    df["blklondd"] = df["blklondd"].astype(float)
    df["blklatdd"] = df["blklatdd"].astype(float)

    df["h3_id"] = df.apply(
        lambda row: h3.latlng_to_cell(row["blklatdd"], row["blklondd"], H3_RESOLUTION),
        axis=1,
    )
    df["state_fips"] = df["cty"].str[:2]
    df["county_fips"] = df["cty"]

    df = df.rename(columns={"tabblk2020": "geoid", "blklondd": "blklon", "blklatdd": "blklat"})
    df = df[["geoid", "h3_id", "blklon", "blklat", "state_fips", "county_fips"]]
    all_blocks.append(df)
    print(f"  {state}: {len(df):,} blocks in active counties")

combined = pd.concat(all_blocks, ignore_index=True)
out_path = CACHE_DIR / "block_h3_lookup.parquet"
combined.to_parquet(out_path, index=False)
print(f"\nSaved {len(combined):,} blocks -> {out_path}")
