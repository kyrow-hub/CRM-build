import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogIn, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Button from '../components/ui/Button.jsx'
import logoMark from '../assets/logo-mark.png'

function ForgotPasswordForm({ onBackToSignIn }) {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const { error } = await requestPasswordReset(email)
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="login-title">Check your email</h1>
        <p className="login-subtitle">
          If an account exists for {email}, a password reset link has been sent. Follow the link to choose a new
          password.
        </p>
        <Button type="button" variant="secondary" onClick={onBackToSignIn} style={{ width: '100%', marginTop: 18 }}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="login-title">Reset your password</h1>
      <p className="login-subtitle">Enter your email and we'll send you a link to reset your password.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label className="form-label" htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {formError && <div className="login-error">{formError}</div>}

        <Button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 18 }}>
          <Mail strokeWidth={2} />
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <button
          type="button"
          className="link-button"
          onClick={onBackToSignIn}
          style={{ display: 'block', margin: '14px auto 0' }}
        >
          Back to sign in
        </button>
      </form>
    </div>
  )
}

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [mode, setMode] = useState('signin')

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
          <img src={logoMark} alt="Bori Muy" className="sidebar-brand-mark" />
          <span className="sidebar-brand-text">Bori Muy CRM</span>
        </div>

        {mode === 'forgot' ? (
          <ForgotPasswordForm onBackToSignIn={() => setMode('signin')} />
        ) : (
          <>
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
              <button
                type="button"
                className="link-button"
                onClick={() => setMode('forgot')}
                style={{ display: 'block', margin: '14px auto 0' }}
              >
                Forgot password?
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
