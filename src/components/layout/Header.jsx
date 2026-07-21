import { LogOut } from 'lucide-react'
import HeaderClientSearch from './HeaderClientSearch.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { initials } from '../../utils/initials.js'

export default function Header({ title, subtitle }) {
  const { profile, user, signOut } = useAuth()
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || ''

  return (
    <header className="header-bar">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div className="header-actions">
        <HeaderClientSearch />
        <div className="header-avatar" title={displayName}>
          {displayName ? initials(displayName) : '—'}
        </div>
        <button type="button" className="header-logout" onClick={signOut} title="Sign out">
          <LogOut strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
