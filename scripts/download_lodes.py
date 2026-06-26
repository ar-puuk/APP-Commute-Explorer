"""Download and filter LODES OD files for active counties."""
import io
import gzip
import requests
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from config import LODES_BASE, YEARS, ACTIVE_STATES, ACTIVE_COUNTIES, CACHE_DIR

OD_DIR = CACHE_DIR / "od"
OD_DIR.mkdir(parents=True, exist_ok=True)

ACTIVE_SET = set(ACTIVE_COUNTIES)


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


def _filter(df: pd.DataFrame) -> pd.DataFrame:
    home_match = df["h_geocode"].str[:5].isin(ACTIVE_SET)
    work_match = df["w_geocode"].str[:5].isin(ACTIVE_SET)
    return df[home_match | work_match].copy()


for state in ACTIVE_STATES:
    for year in tqdm(YEARS, desc=f"{state} OD"):
        out_path = OD_DIR / f"{state}_od_{year}.csv.gz"
        if out_path.exists():
            continue

        main_url = f"{LODES_BASE}/{state}/od/{state}_od_main_JT00_{year}.csv.gz"
        aux_url  = f"{LODES_BASE}/{state}/od/{state}_od_aux_JT00_{year}.csv.gz"

        main_df = _fetch_csv(main_url)
        aux_df  = _fetch_csv(aux_url)

        parts = [df for df in [main_df, aux_df] if df is not None]
        if not parts:
            print(f"  Skipping {state} {year} — no data found")
            continue

        combined = pd.concat(parts, ignore_index=True)
        combined = combined.drop_duplicates(subset=["h_geocode", "w_geocode"])
        filtered = _filter(combined)

        filtered.to_csv(out_path, index=False, compression="gzip")
        print(f"  {state} {year}: {len(filtered):,} rows -> {out_path.name}")

print("Done.")
