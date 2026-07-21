export default function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon strokeWidth={2} />
        </div>
      )}
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
    </div>
  )
}
