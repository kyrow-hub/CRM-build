import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Target,
  Users,
  Building2,
  Calendar,
  ClipboardCheck,
  Mail,
  BarChart3,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Leads', to: '/leads', icon: Target },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Partners', to: '/partners', icon: Building2 },
  { label: 'Meetings', to: '/meetings', icon: Calendar },
  { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
  { label: 'Email', to: '/email', icon: Mail },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">C</div>
        <span className="sidebar-brand-text">Coral CRM</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-label">Coral CRM v0.1</div>
      </div>
    </aside>
  )
}
