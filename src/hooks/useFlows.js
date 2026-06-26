import { useState, useEffect, useRef } from 'react';
import { loadYear, queryOD } from './useDuckDB.js';

export function useFlows(points, pointClusters, year) {
  const [flows, setFlows] = useState([]);
  const [matrixCells, setMatrixCells] = useState(new Map());
  const [totalCommuters, setTotalCommuters] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(0);

  useEffect(() => {
    if (points.length < 2) {
      setFlows([]);
      setMatrixCells(new Map());
      setTotalCommuters(0);
      return;
    }

    const ticket = ++abortRef.current;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadYear(year);

        const allHexIds = [
          ...new Set([...pointClusters.values()].flatMap(s => [...s])),
        ];

        const rows = await queryOD(allHexIds);
        if (ticket !== abortRef.current) return;

        // Build a lookup: h3_id → array of point ids that contain it
        const hexToPoints = new Map();
        for (const [pointId, clusterSet] of pointClusters) {
          for (const h of clusterSet) {
            if (!hexToPoints.has(h)) hexToPoints.set(h, []);
            hexToPoints.get(h).push(pointId);
          }
        }

        // Aggregate raw rows into MatrixCells keyed by "originId|destId"
        const cellMap = new Map();
        for (const row of rows) {
          const origins = hexToPoints.get(row.h_h3) ?? [];
          const dests   = hexToPoints.get(row.w_h3) ?? [];
          for (const oId of origins) {
            for (const dId of dests) {
              const key = `${oId}|${dId}`;
              if (!cellMap.has(key)) {
                cellMap.set(key, { originPointId: oId, destPointId: dId, S000: 0, SA01: 0, SA02: 0, SA03: 0, SI01: 0, SI02: 0, SI03: 0 });
              }
              const cell = cellMap.get(key);
              cell.S000 += row.S000;
              cell.SA01 += row.SA01;
              cell.SA02 += row.SA02;
              cell.SA03 += row.SA03;
              cell.SI01 += row.SI01;
              cell.SI02 += row.SI02;
              cell.SI03 += row.SI03;
            }
          }
        }

        const total = [...cellMap.values()].reduce((s, c) => s + c.S000, 0);

        setFlows(rows);
        setMatrixCells(cellMap);
        setTotalCommuters(total);
      } catch (err) {
        if (ticket === abortRef.current) setError(err.message);
      } finally {
        if (ticket === abortRef.current) setLoading(false);
      }
    };

    run();
  }, [points, pointClusters, year]);

  return { flows, matrixCells, totalCommuters, loading, error };
}
