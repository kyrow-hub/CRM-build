import { NavLink } from 'react-router-dom'
import logoMark from '../../assets/logo-mark.png'
import {
  LayoutDashboard,
  Share2,
  Users,
  Building2,
  Calendar,
  ClipboardCheck,
  Mail,
  MessageSquare,
  BarChart3,
  Settings,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Referrals', to: '/referrals', icon: Share2 },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Partners', to: '/partners', icon: Building2 },
  { label: 'Meetings', to: '/meetings', icon: Calendar },
  { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
  { label: 'Incidents', to: '/incidents', icon: AlertOctagon },
  { label: 'Email', to: '/email', icon: Mail },
  { label: 'SMS', to: '/sms', icon: MessageSquare },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Audit Log', to: '/audit-log', icon: ShieldCheck },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logoMark} alt="Bori Muy" className="sidebar-brand-mark" />
        <span className="sidebar-brand-text">Bori Muy CRM</span>
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
        <div className="sidebar-footer-label">Bori Muy CRM v0.1</div>
      </div>
    </aside>
  )
}
