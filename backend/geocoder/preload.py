import os
from pathlib import Path

from geocodebr import definir_pasta_cache, download_cnefe

cache_dir = os.environ.get("GEOCODEBR_CACHE_DIR", "/data/geocodebr")
Path(cache_dir).mkdir(parents=True, exist_ok=True)
definir_pasta_cache(cache_dir, verboso=False)

print("[geocoder] preparando cache local do CNEFE...")
download_cnefe("todas", verboso=True, cache=True)
print("[geocoder] CNEFE pronto.")
