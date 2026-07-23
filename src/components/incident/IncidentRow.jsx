import { useState } from 'react'
import { UserCheck, CheckCircle2, FileText, Lock, RotateCcw } from 'lucide-react'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import {
  markManagerReviewed,
  setFollowUpCompleted,
  recordOutcome,
  closeIncident,
  reopenIncident,
  incidentMissingForClose,
} from '../../services/incidentService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { initials } from '../../utils/initials.js'
import { avatarTone } from '../../utils/avatarColor.js'

const SEVERITY_TONE = { Low: 'info', Medium: 'warning', High: 'danger', Critical: 'danger' }
const STATUS_TONE = { Open: 'warning', 'Under Review': 'info', Closed: 'success' }

export default function IncidentRow({ incident, canManage, onUpdated, showClient = true }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState(null)
  const [reviewNotes, setReviewNotes] = useState(incident.review_notes || '')
  const [followUpDone, setFollowUpDone] = useState(incident.follow_up_completed)
  const [followUpNotes, setFollowUpNotes] = useState(incident.follow_up_notes || '')
  const [outcome, setOutcome] = useState(incident.outcome || '')
  const [submitting, setSubmitting] = useState(false)

  const isManager = profile?.role === 'administrator' || profile?.role === 'manager'
  const name = incident.client ? [incident.client.first_name, incident.client.last_name].filter(Boolean).join(' ') : null
  const reporterName = incident.reporter ? [incident.reporter.first_name, incident.reporter.last_name].filter(Boolean).join(' ') : 'Unknown'
  const missing = incidentMissingForClose(incident)
  const canClose = incident.status !== 'Closed' && missing.length === 0

  const toggle = (m) => setMode(mode === m ? null : m)

  const handleReview = async () => {
    setSubmitting(true)
    try {
      await markManagerReviewed(incident.id, { reviewedBy: user?.id, reviewNotes })
      toast.success('Marked as manager reviewed.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFollowUp = async () => {
    setSubmitting(true)
    try {
      await setFollowUpCompleted(incident.id, { completed: followUpDone, notes: followUpNotes })
      toast.success('Follow-up updated.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOutcome = async () => {
    setSubmitting(true)
    try {
      await recordOutcome(incident.id, outcome)
      toast.success('Outcome recorded.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async () => {
    if (!window.confirm('Close this incident? It can be reopened later if needed.')) return
    setSubmitting(true)
    try {
      await closeIncident(incident)
      toast.success('Incident closed.')
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopen = async () => {
    setSubmitting(true)
    try {
      await reopenIncident(incident.id)
      toast.success('Incident reopened.')
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{incident.incident_type}</span>
          <StatusPill tone={SEVERITY_TONE[incident.severity]}>{incident.severity}</StatusPill>
          <StatusPill tone={STATUS_TONE[incident.status]}>{incident.status}</StatusPill>
          {incident.confidential && (
            <StatusPill tone="danger">
              <Lock strokeWidth={2} style={{ width: 11, height: 11, marginRight: 3, verticalAlign: 'text-bottom' }} />
              Confidential
            </StatusPill>
          )}
          {showClient && name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <div className={`client-avatar avatar--${avatarTone(name)}`} style={{ width: 22, height: 22, fontSize: 9.5 }}>
                {initials(name)}
              </div>
              {name}
            </span>
          )}
        </div>
        <span>{incident.incident_date}</span>
      </div>
      <div className="note-item-text">{incident.description}</div>
      <div className="data-cell-muted" style={{ marginTop: 4 }}>
        Reported by {reporterName}
        {incident.location ? ` · ${incident.location}` : ''}
      </div>

      <div className="data-cell-muted" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <span>{incident.manager_reviewed ? '✓ Manager Reviewed' : '○ Manager Review pending'}</span>
        <span>{incident.follow_up_completed ? '✓ Follow-up completed' : '○ Follow-up pending'}</span>
        <span>{incident.outcome ? '✓ Outcome recorded' : '○ Outcome pending'}</span>
      </div>

      {canManage && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {isManager && (
            <button type="button" className="link-button" onClick={() => toggle('review')}>
              <UserCheck strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Manager Review
            </button>
          )}
          <button type="button" className="link-button" onClick={() => toggle('followup')}>
            <CheckCircle2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            Follow-up
          </button>
          <button type="button" className="link-button" onClick={() => toggle('outcome')}>
            <FileText strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            Outcome
          </button>
          {incident.status === 'Closed' ? (
            isManager && (
              <button type="button" className="link-button" onClick={handleReopen} disabled={submitting}>
                <RotateCcw strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                Reopen
              </button>
            )
          ) : (
            <button
              type="button"
              className="link-button"
              style={canClose ? { color: '#4ade80' } : { color: 'var(--muted)', cursor: 'not-allowed' }}
              onClick={canClose ? handleClose : undefined}
              disabled={submitting || !canClose}
              title={canClose ? '' : `Still missing: ${missing.join(', ')}`}
            >
              {canClose ? 'Close Incident' : `Can't close - missing ${missing.join(', ')}`}
            </button>
          )}
        </div>
      )}

      {mode === 'review' && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            className="input"
            rows={2}
            placeholder="Review notes (optional)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <Button type="button" onClick={handleReview} disabled={submitting}>
            {submitting ? 'Saving...' : 'Mark Reviewed'}
          </Button>
        </div>
      )}
      {mode === 'followup' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="checkbox-field" style={{ marginTop: 0 }}>
            <input type="checkbox" checked={followUpDone} onChange={(e) => setFollowUpDone(e.target.checked)} />
            <span>Follow-up completed</span>
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea
              className="input"
              rows={2}
              placeholder="Follow-up notes (optional)"
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
            <Button type="button" onClick={handleFollowUp} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
      {mode === 'outcome' && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea className="input" rows={2} placeholder="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          <Button type="button" onClick={handleOutcome} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
