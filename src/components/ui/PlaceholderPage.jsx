import Card from './Card.jsx'
import EmptyState from './EmptyState.jsx'

export default function PlaceholderPage({ icon, title, text }) {
  return (
    <div className="fade-up">
      <Card>
        <EmptyState icon={icon} title={title} text={text} />
      </Card>
    </div>
  )
}
