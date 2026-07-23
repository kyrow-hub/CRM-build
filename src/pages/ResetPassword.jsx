import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { completePasswordReset } from '../services/profileService.js'
import Button from '../components/ui/Button.jsx'
import logoMark from '../assets/logo-mark.png'

export default function ResetPassword() {
  const { session, loading, signOut } = useAuth()
  const toast = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [done, setDone] = useState(false)

  if (done) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.')
      return
    }
    setSubmitting(true)
    try {
      await completePasswordReset(newPassword)
      toast.success('Password reset. Please sign in with your new password.')
      await signOut()
      setDone(true)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="sidebar-brand" style={{ marginBottom: 28, padding: 0 }}>
          <img src={logoMark} alt="Bori Muy" className="sidebar-brand-mark" />
          <span className="sidebar-brand-text">Bori Muy CRM</span>
        </div>

        {loading ? (
          <p className="login-subtitle">Checking your reset link...</p>
        ) : !session ? (
          <div>
            <h1 className="login-title">Link expired</h1>
            <p className="login-subtitle">
              This password reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="login-title">Choose a new password</h1>
            <p className="login-subtitle">Enter and confirm your new password below.</p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label" htmlFor="rp-new">
                  New Password
                </label>
                <input
                  id="rp-new"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="form-label" htmlFor="rp-confirm">
                  Confirm New Password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {formError && <div className="login-error">{formError}</div>}

              <Button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 18 }}>
                <KeyRound strokeWidth={2} />
                {submitting ? 'Saving...' : 'Reset Password'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
