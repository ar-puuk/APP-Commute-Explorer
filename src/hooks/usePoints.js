import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getCluster } from '../utils/h3Utils.js';
import { pointColor } from '../utils/colors.js';
import { getHexMeta } from '../utils/countyConfig.js';

export function usePoints(kRing) {
  const [points, setPoints] = useState([]);

  const pointClusters = useMemo(() => {
    const map = new Map();
    points.forEach(p => map.set(p.id, p.clusterIds));
    return map;
  }, [points]);

  const allClaimedHexIds = useMemo(() => {
    const set = new Set();
    points.forEach(p => p.clusterIds.forEach(h => set.add(h)));
    return set;
  }, [points]);

  const overlapPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i].clusterIds;
        const b = points[j].clusterIds;
        const shared = [...a].some(h => b.has(h));
        if (shared) pairs.push([points[i].id, points[j].id]);
      }
    }
    return pairs;
  }, [points]);

  const addPoint = useCallback(({ lat, lng }) => {
    setPoints(prev => {
      const { latlngToCell, getCluster: gc } = require('../utils/h3Utils.js');
      // resolved dynamically to avoid stale closure on kRing
      return prev; // placeholder — real logic in component via recompute
    });
  }, []);

  const addPointResolved = useCallback(({ lat, lng, rootH3, clusterIds, countyName }) => {
    setPoints(prev => {
      const idx = prev.length;
      const id = uuidv4();
      return [
        ...prev,
        {
          id,
          name: `Point ${idx + 1}`,
          color: pointColor(idx),
          lat,
          lng,
          rootH3,
          clusterIds: new Set(clusterIds),
          countyName: countyName ?? 'Unknown county',
        },
      ];
    });
  }, []);

  const deletePoint = useCallback((id) => {
    setPoints(prev => prev.filter(p => p.id !== id));
  }, []);

  const renamePoint = useCallback((id, name) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const reorderPoint = useCallback((id, direction) => {
    setPoints(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const clearPoints = useCallback(() => setPoints([]), []);

  const recomputeAllClusters = useCallback((newK) => {
    setPoints(prev =>
      prev.map(p => ({
        ...p,
        clusterIds: new Set(getCluster(p.rootH3, newK)),
      }))
    );
  }, []);

  const isNameDuplicate = useCallback((name, excludeId) => {
    return points.some(p => p.id !== excludeId && p.name === name);
  }, [points]);

  return {
    points,
    pointClusters,
    allClaimedHexIds,
    overlapPairs,
    addPointResolved,
    deletePoint,
    renamePoint,
    reorderPoint,
    recomputeAllClusters,
    isNameDuplicate,
    clearPoints,
  };
}
