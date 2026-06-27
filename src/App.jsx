import { useState, useEffect } from 'react';
import { usePoints } from './hooks/usePoints.js';
import { useFlows }  from './hooks/useFlows.js';
import { initDB, loadYear, queryAllOD } from './hooks/useDuckDB.js';
import { loadHexMeta } from './utils/countyConfig.js';
import AppHeader    from './components/AppHeader.jsx';
import MapView      from './components/MapView.jsx';
import ODMatrix     from './components/ODMatrix.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';

const MIN_K = 0;

export default function App() {
  const [year,       setYear]       = useState(2019);
  const [kRing,      setKRing]      = useState(1);
  const [activeView, setActiveView] = useState('map');
  const [dbReady,    setDbReady]    = useState(false);
  const [dbError,    setDbError]    = useState(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [appMode,    setAppMode]    = useState('overview');

  const [overviewLocations, setOverviewLocations] = useState([]);
  const [overviewFlows,     setOverviewFlows]     = useState([]);
  const [overviewLoading,   setOverviewLoading]   = useState(false);

  const {
    points, pointClusters, allClaimedHexIds, overlapPairs,
    addPointResolved, deletePoint, renamePoint, reorderPoint,
    recomputeAllClusters, isNameDuplicate,
    clearPoints,
  } = usePoints(kRing);

  const { flows, matrixCells, totalCommuters, loading, error } = useFlows(
    appMode === 'select' ? points : [],
    pointClusters,
    year,
  );

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(e => setDbError(e.message));
  }, []);

  useEffect(() => {
    loadHexMeta()
      .then(() => setMetaLoaded(true))
      .catch(() => setMetaLoaded(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;
    setOverviewLoading(true);

    loadYear(year)
      .then(() => queryAllOD(3))
      .then(rows => {
        if (cancelled) return;
        const gridCells = new Map();
        for (const r of rows) {
          const hId = `${r.h_lat_g}|${r.h_lon_g}`;
          const wId = `${r.w_lat_g}|${r.w_lon_g}`;
          if (!gridCells.has(hId)) gridCells.set(hId, { lat: r.h_lat_g, lon: r.h_lon_g });
          if (!gridCells.has(wId)) gridCells.set(wId, { lat: r.w_lat_g, lon: r.w_lon_g });
        }
        const locs  = [...gridCells.entries()].map(([id, c]) => ({ id, lat: c.lat, lon: c.lon, name: '' }));
        const fls   = rows.map(r => ({
          origin: `${r.h_lat_g}|${r.h_lon_g}`,
          dest:   `${r.w_lat_g}|${r.w_lon_g}`,
          count:  r.total,
        }));
        console.log(`[Overview] ${locs.length} grid cells, ${fls.length} flows`);
        setOverviewLocations(locs);
        setOverviewFlows(fls);
      })
      .catch(err => console.error('[Overview] failed to load:', err))
      .finally(() => { if (!cancelled) setOverviewLoading(false); });

    return () => { cancelled = true; };
  }, [dbReady, year]);

  const handleKRingChange = (newK) => {
    const k = Math.max(MIN_K, newK);
    setKRing(k);
    recomputeAllClusters(k);
  };

  const enterSelectMode   = () => setAppMode('select');
  const enterOverviewMode = () => { setAppMode('overview'); clearPoints(); };

  /* ── Fatal DB error ── */
  if (dbError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-error)' }}>Failed to initialise DuckDB</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{dbError}</div>
        <button onClick={() => window.location.reload()} className="btn-primary">Reload</button>
      </div>
    );
  }

  const isSelect = appMode === 'select';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <AppHeader
        year={year}
        kRing={kRing}
        activeView={activeView}
        appMode={appMode}
        loading={loading}
        overviewLoading={overviewLoading}
        error={error}
        dbReady={dbReady}
        points={points}
        onYearChange={setYear}
        onKRingChange={handleKRingChange}
        onViewChange={setActiveView}
        onEnterSelect={enterSelectMode}
        onEnterOverview={enterOverviewMode}
      />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — select mode only */}
        {isSelect && (
          <AnalysisPanel
            points={points}
            overlapPairs={overlapPairs}
            totalCommuters={totalCommuters}
            year={year}
            onDelete={deletePoint}
            onRename={renamePoint}
            onReorder={reorderPoint}
            isNameDuplicate={isNameDuplicate}
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isSelect && activeView === 'matrix' && points.length >= 2 ? (
            <ODMatrix
              points={points}
              matrixCells={matrixCells}
              year={year}
              totalCommuters={totalCommuters}
            />
          ) : (
            <MapView
              appMode={appMode}
              points={points}
              kRing={kRing}
              activeView={activeView}
              onAddPoint={addPointResolved}
              matrixCells={matrixCells}
              allClaimedHexIds={allClaimedHexIds}
              overviewLocations={overviewLocations}
              overviewFlows={overviewFlows}
            />
          )}

          {/* Matrix empty state */}
          {isSelect && activeView === 'matrix' && points.length < 2 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
              Add at least 2 zones on the map to view the OD matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
