import { useEffect, useState } from 'react'
import { useLocation, useMatch, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { getClientById } from '../../services/clientService.js'
import { usePartners } from '../../context/PartnersContext.jsx'

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your pipeline' },
  '/leads': { title: 'Leads', subtitle: 'Track and qualify new prospects' },
  '/clients': { title: 'Clients', subtitle: 'Everyone you do business with' },
  '/partners': { title: 'Partners', subtitle: 'Businesses and organizations you work with' },
  '/meetings': { title: 'Meetings', subtitle: 'Upcoming and past meetings' },
  '/attendance': { title: 'Attendance Register', subtitle: 'Track program and activity attendance' },
  '/email': { title: 'Email', subtitle: 'Conversations with your clients' },
  '/reports': { title: 'Data Reports', subtitle: 'Case notes, referrals, goals, and service delivery' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
}

export default function Layout() {
  const { pathname } = useLocation()
  const clientMatch = useMatch('/clients/:id')
  const partnerMatch = useMatch('/partners/:id')
  const { partners } = usePartners()
  const [clientMeta, setClientMeta] = useState(null)

  useEffect(() => {
    if (!clientMatch) {
      setClientMeta(null)
      return
    }
    let cancelled = false
    getClientById(clientMatch.params.id)
      .then((client) => {
        if (cancelled) return
        const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ')
        setClientMeta({ title: fullName, subtitle: client.client_number })
      })
      .catch(() => {
        if (!cancelled) setClientMeta({ title: 'Client not found' })
      })
    return () => {
      cancelled = true
    }
  }, [clientMatch])

  let meta = PAGE_META[pathname]

  if (!meta && clientMatch) {
    meta = clientMeta ?? { title: 'Loading...' }
  }

  if (!meta && partnerMatch) {
    const partner = partners.find((p) => String(p.id) === partnerMatch.params.id)
    meta = partner ? { title: partner.businessName, subtitle: partner.address } : { title: 'Partner not found' }
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
