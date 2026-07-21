import { useLocation, useMatch, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { mockClients } from '../../data/mockClients.js'

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your pipeline' },
  '/leads': { title: 'Leads', subtitle: 'Track and qualify new prospects' },
  '/clients': { title: 'Clients', subtitle: 'Everyone you do business with' },
  '/deals': { title: 'Deals', subtitle: 'Opportunities in your pipeline' },
  '/meetings': { title: 'Meetings', subtitle: 'Upcoming and past meetings' },
  '/attendance': { title: 'Attendance Register', subtitle: 'Track program and activity attendance' },
  '/email': { title: 'Email', subtitle: 'Conversations with your clients' },
  '/reports': { title: 'Data Reports', subtitle: 'Case notes, referrals, goals, and service delivery' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
}

export default function Layout() {
  const { pathname } = useLocation()
  const clientMatch = useMatch('/clients/:id')

  let meta = PAGE_META[pathname]

  if (!meta && clientMatch) {
    const client = mockClients.find((c) => String(c.id) === clientMatch.params.id)
    meta = client ? { title: client.name, subtitle: client.company } : { title: 'Client not found' }
  }

  meta = meta ?? { title: 'Coral CRM' }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="content-area">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
