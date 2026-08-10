export function StatCard({ label, stats, unit, color }) {
  const StatItem = ({ name, value }) => (
    <div className="monitoring-stat-item">
      <span>{name}</span>
      <strong>{typeof value === 'number' ? value.toFixed(2) : '--'}</strong>
    </div>
  );

  return (
    <div className="monitoring-stat-card" style={{ borderColor: `${color}33` }}>
      <div className="monitoring-stat-header">
        <span className="monitoring-stat-label" style={{ color }}>{label}</span>
        <span className="monitoring-stat-unit">{unit}</span>
      </div>
      <div className="monitoring-stat-items">
        <StatItem name="Latest" value={stats.latest} />
        <StatItem name="Avg" value={stats.avg} />
        <StatItem name="Min" value={stats.min} />
        <StatItem name="Max" value={stats.max} />
      </div>
    </div>
  );
}
