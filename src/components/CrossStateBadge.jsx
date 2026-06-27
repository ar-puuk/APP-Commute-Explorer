export default function CrossStateBadge({ countyName }) {
  if (!countyName) return null;
  return (
    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
      {countyName}
    </span>
  );
}
