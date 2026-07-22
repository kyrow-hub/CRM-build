import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import Clients from './pages/Clients.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import Partners from './pages/Partners.jsx'
import PartnerDetail from './pages/PartnerDetail.jsx'
import Referrals from './pages/Referrals.jsx'
import Meetings from './pages/Meetings.jsx'
import AttendanceRegister from './pages/AttendanceRegister.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/attendance" element={<AttendanceRegister />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
