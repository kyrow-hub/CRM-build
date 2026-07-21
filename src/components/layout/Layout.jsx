import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your pipeline' },
  '/leads': { title: 'Leads', subtitle: 'Track and qualify new prospects' },
  '/contacts': { title: 'Contacts', subtitle: 'Everyone you do business with' },
  '/deals': { title: 'Deals', subtitle: 'Opportunities in your pipeline' },
  '/meetings': { title: 'Meetings', subtitle: 'Upcoming and past meetings' },
  '/email': { title: 'Email', subtitle: 'Conversations with your contacts' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
}

export default function Layout() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? { title: 'Coral CRM' }

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
