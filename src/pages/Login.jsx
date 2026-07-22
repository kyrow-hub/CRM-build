import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Button from '../components/ui/Button.jsx'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  if (!loading && session) {
    const redirectTo = location.state?.from?.pathname ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="sidebar-brand" style={{ marginBottom: 28, padding: 0 }}>
          <div className="sidebar-brand-mark">B</div>
          <span className="sidebar-brand-text">Bori Muy CRM</span>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Bori Muy LTD staff portal</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {formError && <div className="login-error">{formError}</div>}

          <Button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 18 }}>
            <LogIn strokeWidth={2} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
