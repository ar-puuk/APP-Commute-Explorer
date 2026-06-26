import { useState, useEffect } from 'react';
import { usePoints } from './hooks/usePoints.js';
import { useFlows } from './hooks/useFlows.js';
import { initDB } from './hooks/useDuckDB.js';
import { loadHexMeta } from './utils/countyConfig.js';
import MapView from './components/MapView.jsx';
import ODMatrix from './components/ODMatrix.jsx';
import PointList from './components/PointList.jsx';
import YearSelector from './components/YearSelector.jsx';
import ViewToggle from './components/ViewToggle.jsx';

const MIN_K = 0;
const MAX_K = 3;

export default function App() {
  const [year,       setYear]       = useState(2019);
  const [kRing,      setKRing]      = useState(1);
  const [activeView, setActiveView] = useState('map');
  const [dbReady,    setDbReady]    = useState(false);
  const [dbError,    setDbError]    = useState(null);
  const [metaLoaded, setMetaLoaded] = useState(false);

  const {
    points, pointClusters, allClaimedHexIds, overlapPairs,
    addPointResolved, deletePoint, renamePoint, reorderPoint,
    recomputeAllClusters, isNameDuplicate,
  } = usePoints(kRing);

  const { flows, matrixCells, totalCommuters, loading, error } = useFlows(
    points, pointClusters, year
  );

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(e => setDbError(e.message));
  }, []);

  useEffect(() => {
    loadHexMeta()
      .then(() => setMetaLoaded(true))
      .catch(() => setMetaLoaded(true)); // silently continue; getHexMeta returns null
  }, []);

  const handleKRingChange = (newK) => {
    setKRing(newK);
    recomputeAllClusters(newK);
  };

  if (dbError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, color: '#dc2626' }}>Failed to initialise DuckDB</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{dbError}</div>
        <button onClick={() => window.location.reload()} style={primaryBtn}>Reload</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px',
        background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginRight: 4 }}>
          Commuter Flow Explorer
        </span>

        <YearSelector year={year} onChange={setYear} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          Ring size
          <select
            value={kRing}
            onChange={e => handleKRingChange(Number(e.target.value))}
            style={selectStyle}
          >
            {Array.from({ length: MAX_K - MIN_K + 1 }, (_, i) => i + MIN_K).map(k => (
              <option key={k} value={k}>k = {k}</option>
            ))}
          </select>
        </label>

        <ViewToggle activeView={activeView} onChange={setActiveView} />

        {loading && <span style={{ fontSize: 12, color: '#6b7280' }}>Loading flows…</span>}
        {error   && <span style={{ fontSize: 12, color: '#ef4444' }}>⚠ {error}</span>}
        {!dbReady && !dbError && <span style={{ fontSize: 12, color: '#6b7280' }}>Initialising DuckDB…</span>}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 240, flexShrink: 0, borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden',
        }}>
          <PointList
            points={points}
            overlapPairs={overlapPairs}
            totalCommuters={totalCommuters}
            onDelete={deletePoint}
            onRename={renamePoint}
            onReorder={reorderPoint}
            isNameDuplicate={isNameDuplicate}
          />
          {points.length === 0 && (
            <div style={{ padding: '0 12px 12px', fontSize: 11, color: '#9ca3af' }}>
              Click on the map to place analysis points. Add at least 2 to see flows.
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeView === 'matrix' && points.length >= 2 ? (
            <ODMatrix points={points} matrixCells={matrixCells} />
          ) : (
            <MapView
              points={points}
              kRing={kRing}
              activeView={activeView}
              onAddPoint={addPointResolved}
              matrixCells={matrixCells}
              allClaimedHexIds={allClaimedHexIds}
            />
          )}

          {activeView === 'matrix' && points.length < 2 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              Add at least 2 points on the map to view the OD matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  fontSize: 12, padding: '2px 6px', borderRadius: 4,
  border: '1px solid #d1d5db', background: '#f9fafb',
};

const primaryBtn = {
  fontSize: 13, padding: '6px 14px', borderRadius: 6,
  background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer',
};
