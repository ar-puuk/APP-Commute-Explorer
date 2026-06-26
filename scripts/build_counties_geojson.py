"""Build counties.geojson — simplified county union for the map boundary overlay.

Outputs two GeoJSON features:
  kind=boundary  polygon of the county union (for the dashed border line)
  kind=mask      world rectangle minus that union (dims the outside area)

Run once after adding/removing counties in counties.yaml.
"""
import io
import json
import tempfile
import zipfile
from pathlib import Path

import requests
import geopandas as gpd
from shapely.geometry import box, mapping
from config import OUTPUT_DIR, ACTIVE_COUNTIES

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TIGER_YEAR = 2023
TOLERANCE  = 0.01   # degrees (~1 km) — coarse enough to keep the file small

active_set = set(ACTIVE_COUNTIES)

url = (
    f"https://www2.census.gov/geo/tiger/TIGER{TIGER_YEAR}/COUNTY/"
    f"tl_{TIGER_YEAR}_us_county.zip"
)
print(f"Downloading {url} …")
r = requests.get(url, timeout=180)
r.raise_for_status()

with tempfile.TemporaryDirectory() as tmp:
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        z.extractall(tmp)
    shp = next(Path(tmp).glob("*.shp"))
    gdf = gpd.read_file(shp)

combined = gdf[gdf["GEOID"].isin(active_set)][["GEOID", "NAME", "geometry"]].copy()
if combined.crs and combined.crs.to_epsg() != 4326:
    combined = combined.to_crs("EPSG:4326")
print(f"Matched {len(combined)}/{len(active_set)} counties")

union_geom = combined.geometry.union_all()
simplified = union_geom.simplify(TOLERANCE, preserve_topology=True)

# World rectangle minus the county union — rendered as a dim overlay outside the data area
world     = box(-179.9, -85.0, 179.9, 85.0)
mask_geom = world.difference(simplified)

features = [
    {"type": "Feature", "properties": {"kind": "boundary"}, "geometry": mapping(simplified)},
    {"type": "Feature", "properties": {"kind": "mask"},     "geometry": mapping(mask_geom)},
]
out_path = OUTPUT_DIR / "counties.geojson"
out_path.write_text(
    json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
    encoding="utf-8",
)

print(f"\ncounties.geojson: {out_path.stat().st_size / 1024:.1f} KB -> {out_path}")
