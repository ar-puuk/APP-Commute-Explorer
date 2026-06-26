import yaml
from pathlib import Path

H3_RESOLUTION = 9
YEARS = list(range(2002, 2024))
LODES_BASE = "https://lehd.ces.census.gov/data/lodes/LODES8"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"
CACHE_DIR = Path(__file__).parent / ".cache"

_yaml_path = Path(__file__).parent / "counties.yaml"
with open(_yaml_path) as f:
    _county_config = yaml.safe_load(f)

ACTIVE_COUNTIES: list[str] = [c["fips"] for c in _county_config["counties"]]
ACTIVE_STATES: list[str] = list({c["state"] for c in _county_config["counties"]})
COUNTY_NAMES: dict[str, str] = {c["fips"]: c["name"] for c in _county_config["counties"]}
