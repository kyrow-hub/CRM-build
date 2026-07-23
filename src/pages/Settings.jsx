import { useState } from 'react'
import { Users } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useProfiles } from '../hooks/useProfiles.js'
import { updateOwnProfile, updateProfileRole, updateProfileActive, changeOwnPassword } from '../services/profileService.js'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const ROLE_OPTIONS = ['administrator', 'manager', 'case_worker', 'program_worker', 'viewer']

const ROLE_LABEL = {
  administrator: 'Administrator',
  manager: 'Manager',
  case_worker: 'Case Worker',
  program_worker: 'Program Worker',
  viewer: 'Viewer',
}

function MyProfileCard() {
  const { profile, user, refreshProfile } = useAuth()
  const toast = useToast()
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateOwnProfile(profile.id, { first_name: firstName, last_name: lastName, phone })
      await refreshProfile()
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <div className="section-title" style={{ marginBottom: 4 }}>
        My Profile
      </div>
      <div className="section-subtitle" style={{ marginBottom: 18 }}>
        Your account details. Only administrators and managers can change your role or access.
      </div>
      <form onSubmit={handleSave}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="me-first">
              First Name
            </label>
            <input id="me-first" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="form-label" htmlFor="me-last">
              Last Name
            </label>
            <input id="me-last" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div>
            <label className="form-label" htmlFor="me-phone">
              Phone
            </label>
            <input id="me-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="form-label" htmlFor="me-email">
              Email
            </label>
            <input id="me-email" className="input" value={user?.email || ''} disabled />
          </div>
          <div>
            <label className="form-label" htmlFor="me-role">
              Role
            </label>
            <input id="me-role" className="input" value={ROLE_LABEL[profile?.role] || profile?.role || ''} disabled />
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ChangePasswordCard() {
  const { user } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.')
      return
    }
    setSubmitting(true)
    try {
      await changeOwnPassword(user.email, currentPassword, newPassword)
      toast.success('Password changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <div className="section-title" style={{ marginBottom: 4 }}>
        Change Password
      </div>
      <div className="section-subtitle" style={{ marginBottom: 18 }}>
        Update the password you use to log in.
      </div>
      <form onSubmit={handleSave}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="pw-current">
              Current Password
            </label>
            <input
              id="pw-current"
              type="password"
              className="input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="pw-new">
              New Password
            </label>
            <input
              id="pw-new"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="pw-confirm">
              Confirm New Password
            </label>
            <input
              id="pw-confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function TeamRow({ member, isSelf, onUpdated }) {
  const toast = useToast()
  const [savingRole, setSavingRole] = useState(false)
  const [savingActive, setSavingActive] = useState(false)
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Unknown'

  const handleRoleChange = async (role) => {
    setSavingRole(true)
    try {
      await updateProfileRole(member.id, role)
      toast.success(`${name}'s role updated.`)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingRole(false)
    }
  }

  const handleActiveToggle = async () => {
    setSavingActive(true)
    try {
      await updateProfileActive(member.id, !member.active)
      toast.success(`${name} ${member.active ? 'deactivated' : 'reactivated'}.`)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingActive(false)
    }
  }

  return (
    <div className="data-row team-row">
      <div className="client-identity">
        <div className={`client-avatar avatar--${avatarTone(name)}`}>{initials(name)}</div>
        <span>
          {name}
          {isSelf && <span className="data-cell-muted"> (you)</span>}
        </span>
      </div>
      <span className="data-cell-muted">{member.email}</span>
      <select
        className="input"
        value={member.role}
        disabled={savingRole}
        onChange={(e) => handleRoleChange(e.target.value)}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusPill tone={member.active ? 'success' : 'neutral'}>{member.active ? 'Active' : 'Inactive'}</StatusPill>
        <Button type="button" variant="secondary" disabled={savingActive || isSelf} onClick={handleActiveToggle}>
          {member.active ? 'Deactivate' : 'Reactivate'}
        </Button>
      </div>
    </div>
  )
}

function TeamManagementCard() {
  const { profile } = useAuth()
  const { profiles, loading, error, refetch } = useProfiles()

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: '22px 22px 0' }}>
        <div className="section-title" style={{ marginBottom: 4 }}>
          Team Management
        </div>
        <div className="section-subtitle" style={{ marginBottom: 18 }}>
          Manage staff roles and access. Only administrators and managers can see this section.
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 22 }}>
          <EmptyState icon={Users} title="Loading team..." text="Fetching staff accounts." />
        </div>
      ) : error ? (
        <div style={{ padding: 22 }}>
          <EmptyState icon={Users} title="Couldn't load team" text={error} />
        </div>
      ) : (
        <div className="data-table">
          <div className="data-row team-row data-row--head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {profiles.map((member) => (
            <TeamRow key={member.id} member={member} isSelf={member.id === profile.id} onUpdated={refetch} />
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Settings() {
  const { profile } = useAuth()
  const canManageTeam = profile?.role === 'administrator' || profile?.role === 'manager'

  return (
    <div className="fade-up">
      <MyProfileCard />
      <ChangePasswordCard />
      {canManageTeam && <TeamManagementCard />}
    </div>
  )
}
