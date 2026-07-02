export function StatCard({ label, stats, unit, color }) {
  const StatItem = ({ name, value }) => (
    <div className="text-center">
      <span className="text-xs text-gray-400 uppercase">{name}</span>
      <span className="block text-lg font-semibold">{typeof value === 'number' ? value.toFixed(2) : '--'}</span>
    </div>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg" style={{ color }}>{label}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-gray-200">
        <StatItem name="Latest" value={stats.latest} />
        <StatItem name="Avg" value={stats.avg} />
        <StatItem name="Min" value={stats.min} />
        <StatItem name="Max" value={stats.max} />
      </div>
    </div>
  );
}
