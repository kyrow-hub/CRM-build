import { Calendar } from 'lucide-react'
import PlaceholderPage from '../components/ui/PlaceholderPage.jsx'

export default function Meetings() {
  return (
    <PlaceholderPage
      icon={Calendar}
      title="No meetings scheduled"
      text="Upcoming and past meetings will be listed here."
    />
  )
}
