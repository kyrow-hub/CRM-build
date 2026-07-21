import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import Contacts from './pages/Contacts.jsx'
import ContactDetail from './pages/ContactDetail.jsx'
import Deals from './pages/Deals.jsx'
import Meetings from './pages/Meetings.jsx'
import Email from './pages/Email.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/email" element={<Email />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
