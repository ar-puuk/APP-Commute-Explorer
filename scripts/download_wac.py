"""Download and filter LODES WAC (Workplace Area Characteristics) files."""
import io
import gzip
import requests
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from config import LODES_BASE, YEARS, ACTIVE_STATES, ACTIVE_COUNTIES, CACHE_DIR

WAC_DIR = CACHE_DIR / "wac"
WAC_DIR.mkdir(parents=True, exist_ok=True)

ACTIVE_SET = set(ACTIVE_COUNTIES)
KEEP_COLS = ["w_geocode", "SI01", "SI02", "SI03"]


def _fetch_csv(url: str) -> pd.DataFrame | None:
    try:
        r = requests.get(url, timeout=120)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return pd.read_csv(io.BytesIO(gzip.decompress(r.content)), dtype=str)
    except Exception as e:
        print(f"  Warning: {url}: {e}")
        return None


for state in ACTIVE_STATES:
    for year in tqdm(YEARS, desc=f"{state} WAC"):
        out_path = WAC_DIR / f"{state}_wac_{year}.csv.gz"
        if out_path.exists():
            continue

        url = f"{LODES_BASE}/{state}/wac/{state}_wac_S000_JT00_{year}.csv.gz"
        df = _fetch_csv(url)
        if df is None:
            continue

        available = [c for c in KEEP_COLS if c in df.columns]
        df = df[available].copy()
        df = df[df["w_geocode"].str[:5].isin(ACTIVE_SET)]

        df.to_csv(out_path, index=False, compression="gzip")
        print(f"  {state} {year}: {len(df):,} work blocks -> {out_path.name}")

print("Done.")
