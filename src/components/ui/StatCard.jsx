import Card from './Card.jsx'

export default function StatCard({ label, value, meta, icon: Icon, style }) {
  return (
    <Card style={style}>
      <div className="stat-card-label">
        <span>{label}</span>
        {Icon && (
          <div className="stat-card-icon">
            <Icon strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {meta && <div className="stat-card-meta">{meta}</div>}
    </Card>
  )
}
