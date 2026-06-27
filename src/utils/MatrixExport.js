function esc(str) {
  const s = String(str ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : `"${s}"`;
}

function triggerDownload(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Wide (matrix) CSV export — rows = origins, columns = destinations.
 * Matches the visual layout of the OD matrix table.
 */
export function exportWide(points, matrixCells, year) {
  const rows = [];

  // Metadata header rows
  rows.push([esc('ORIGIN-DESTINATION MATRIX')].concat(Array(points.length + 1).fill('""')).join(','));
  rows.push([esc(`Data year: ${year}`)].concat(Array(points.length + 1).fill('""')).join(','));

  // Column header row: corner cell + destination names + totals column
  const headerRow = [
    esc('Origin \\ Dest'),
    ...points.map(p => esc(`DESTINATION: ${p.name}`)),
    esc('OUTBOUND TOTAL'),
  ];
  rows.push(headerRow.join(','));

  // Row totals
  const rowTotals = new Map();
  const colTotals = new Map();
  for (const [, cell] of matrixCells) {
    rowTotals.set(cell.originPointId, (rowTotals.get(cell.originPointId) ?? 0) + cell.S000);
    colTotals.set(cell.destPointId,   (colTotals.get(cell.destPointId)   ?? 0) + cell.S000);
  }

  // Data rows
  for (const origin of points) {
    const dataRow = [esc(`ORIGIN: ${origin.name}`)];
    for (const dest of points) {
      if (origin.id === dest.id) {
        dataRow.push('""');
      } else {
        const cell = matrixCells.get(`${origin.id}|${dest.id}`);
        dataRow.push(cell?.S000 ? String(cell.S000) : '"0"');
      }
    }
    dataRow.push(String(rowTotals.get(origin.id) ?? 0));
    rows.push(dataRow.join(','));
  }

  // Inbound totals row
  const totalsRow = [esc('INBOUND TOTAL')];
  for (const dest of points) {
    totalsRow.push(String(colTotals.get(dest.id) ?? 0));
  }
  totalsRow.push('""');
  rows.push(totalsRow.join(','));

  triggerDownload(rows.join('\n'), `od_matrix_wide_${year}.csv`);
}

/**
 * Long (tidy) CSV export — one row per OD pair, all LODES fields.
 * Suitable for R / Python / Excel pivot analysis.
 */
export function exportLong(points, matrixCells, year) {
  const rows = [];

  // Header
  rows.push([
    'origin', 'destination',
    'total_commuters',
    'low_wage_sa01', 'mid_wage_sa02', 'high_wage_sa03',
    'goods_producing_si01', 'trade_transport_si02', 'other_services_si03',
  ].map(h => esc(h)).join(','));

  const pointMap = new Map(points.map(p => [p.id, p]));

  for (const [, cell] of matrixCells) {
    if (!cell.S000) continue;
    const origin = pointMap.get(cell.originPointId);
    const dest   = pointMap.get(cell.destPointId);
    if (!origin || !dest) continue;

    rows.push([
      esc(origin.name),
      esc(dest.name),
      cell.S000,
      cell.SA01, cell.SA02, cell.SA03,
      cell.SI01, cell.SI02, cell.SI03,
    ].join(','));
  }

  triggerDownload(rows.join('\n'), `od_matrix_long_${year}.csv`);
}
