import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import Partners from './pages/Partners.jsx'
import PartnerDetail from './pages/PartnerDetail.jsx'
import Referrals from './pages/Referrals.jsx'
import Incidents from './pages/Incidents.jsx'
import Meetings from './pages/Meetings.jsx'
import AttendanceRegister from './pages/AttendanceRegister.jsx'
import Email from './pages/Email.jsx'
import Sms from './pages/Sms.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import AuditLog from './pages/AuditLog.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/attendance" element={<AttendanceRegister />} />
              <Route path="/email" element={<Email />} />
              <Route path="/sms" element={<Sms />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/audit-log" element={<AuditLog />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
