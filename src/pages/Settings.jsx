import { Settings as SettingsIcon } from 'lucide-react'
import PlaceholderPage from '../components/ui/PlaceholderPage.jsx'

export default function Settings() {
  return (
    <PlaceholderPage
      icon={SettingsIcon}
      title="Nothing to configure yet"
      text="Workspace settings will be manageable from here."
    />
  )
}
