import { useEffect, useState } from 'react'
import { useLocation, useMatch, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { getClientById } from '../../services/clientService.js'
import { getPartnerById } from '../../services/partnerService.js'

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your pipeline' },
  '/referrals': { title: 'Referrals', subtitle: 'Track referrals from first contact to accepted or declined' },
  '/clients': { title: 'Clients', subtitle: 'Everyone you do business with' },
  '/partners': { title: 'Partners', subtitle: 'Businesses and organizations you work with' },
  '/meetings': { title: 'Meetings', subtitle: 'Upcoming and past meetings' },
  '/attendance': { title: 'Attendance Register', subtitle: 'Track program and activity attendance' },
  '/email': { title: 'Email', subtitle: 'Send and receive email with your clients' },
  '/reports': { title: 'Data Reports', subtitle: 'Case notes, referrals, goals, and service delivery' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
}

export default function Layout() {
  const { pathname } = useLocation()
  const clientMatch = useMatch('/clients/:id')
  const partnerMatch = useMatch('/partners/:id')
  const [clientMeta, setClientMeta] = useState(null)
  const [partnerMeta, setPartnerMeta] = useState(null)

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

  useEffect(() => {
    if (!partnerMatch) {
      setPartnerMeta(null)
      return
    }
    let cancelled = false
    getPartnerById(partnerMatch.params.id)
      .then((partner) => {
        if (cancelled) return
        setPartnerMeta({ title: partner.business_name, subtitle: partner.address })
      })
      .catch(() => {
        if (!cancelled) setPartnerMeta({ title: 'Partner not found' })
      })
    return () => {
      cancelled = true
    }
  }, [partnerMatch])

  let meta = PAGE_META[pathname]

  if (!meta && clientMatch) {
    meta = clientMeta ?? { title: 'Loading...' }
  }

  if (!meta && partnerMatch) {
    meta = partnerMeta ?? { title: 'Loading...' }
  }

  meta = meta ?? { title: 'Bori Muy CRM' }

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
