import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let conn = null;
let currentYear = null;
let initPromise = null;

export async function initDB() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
    );
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    conn = await db.connect();
  })();
  return initPromise;
}

function dataUrl(year) {
  // DuckDB-WASM resolves paths against the blob worker URL, not the app base.
  // Must use a full absolute URL so the browser fetch inside the worker succeeds.
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}data/od_${year}.parquet`;
}

export async function loadYear(year) {
  if (!conn) throw new Error('DuckDB not initialised — call initDB() first');
  if (year === currentYear) return;
  await conn.query(
    `CREATE OR REPLACE VIEW od AS SELECT * FROM parquet_scan('${dataUrl(year)}')`
  );
  currentYear = year;
}

export async function queryAllOD(minFlow = 3) {
  if (!conn) throw new Error('DuckDB not initialised');
  const result = await conn.query(`
    SELECT h_h3, w_h3, S000
    FROM od
    WHERE S000 >= ${minFlow} AND h_h3 != w_h3
  `);
  return result.toArray().map(row => ({
    h_h3: row.h_h3,
    w_h3: row.w_h3,
    S000: Number(row.S000),
  }));
}

export async function queryOD(allHexIds) {
  if (!conn) throw new Error('DuckDB not initialised');
  if (!allHexIds.length) return [];
  const list = allHexIds.map(h => `'${h}'`).join(',');
  const result = await conn.query(`
    SELECT h_h3, w_h3, h_lon, h_lat, w_lon, w_lat,
           S000, SA01, SA02, SA03, SI01, SI02, SI03
    FROM od
    WHERE h_h3 IN (${list}) AND w_h3 IN (${list})
  `);
  return result.toArray().map(row => ({
    h_h3: row.h_h3,
    w_h3: row.w_h3,
    h_lon: row.h_lon,
    h_lat: row.h_lat,
    w_lon: row.w_lon,
    w_lat: row.w_lat,
    S000:  Number(row.S000),
    SA01:  Number(row.SA01),
    SA02:  Number(row.SA02),
    SA03:  Number(row.SA03),
    SI01:  Number(row.SI01),
    SI02:  Number(row.SI02),
    SI03:  Number(row.SI03),
  }));
}
