import './StatCard.css';

export default function StatCard({ icon, label, value, accent = 'primary', mini, className = '' }) {
  return (
    <div className={`stat-card stat-card-${accent} ${className}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {icon && <div className={`stat-card-icon stat-icon-${accent}`}>{icon}</div>}
      </div>
      <div className="stat-card-value">{value}</div>
      {mini && <div className="stat-card-mini">{mini}</div>}
    </div>
  );
}
