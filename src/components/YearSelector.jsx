const COVID_YEARS = new Set([2020, 2021]);
const YEARS = Array.from({ length: 22 }, (_, i) => 2002 + i);

export default function YearSelector({ year, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <label htmlFor="year-select" style={{ fontWeight: 600, fontSize: 13 }}>Year:</label>
      <select
        id="year-select"
        value={year}
        onChange={e => onChange(Number(e.target.value))}
        style={{ fontSize: 13, padding: '2px 4px', borderRadius: 4 }}
      >
        {YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      {COVID_YEARS.has(year) && (
        <span
          title="2020 and 2021 reflect COVID-19 disruption to commute patterns"
          style={{
            background: '#f59e0b', color: '#fff',
            borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700,
          }}
        >
          ⚠ COVID
        </span>
      )}
    </div>
  );
}
