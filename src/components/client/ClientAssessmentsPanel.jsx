import { useEffect, useState } from 'react'
import { Plus, ClipboardCheck, ChevronDown, ChevronUp, X, CalendarClock } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import AssessmentForm from './AssessmentForm.jsx'
import { useClientAssessments } from '../../hooks/useClientAssessments.js'
import { createAssessment, deleteAssessment } from '../../services/assessmentService.js'
import { useServicePlanItems } from '../../hooks/useServicePlanItems.js'
import { createServicePlanItem, updateServicePlanItemStatus } from '../../services/servicePlanService.js'
import { listAssignableWorkers, updateNextReviewDate } from '../../services/clientService.js'
import { SEWB_DOMAINS, RISK_DOMAINS, NEEDS_DOMAINS, SERVICE_TYPES } from '../../data/assessmentOptions.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const TYPE_TONE = { Intake: 'info', Review: 'warning', Exit: 'neutral' }
const RISK_TONE = { Low: 'success', Medium: 'warning', High: 'danger' }
const PROGRESS_TONE = { Improved: 'success', 'No change': 'neutral', Declined: 'danger' }

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyServiceForm = { service_type: SERVICE_TYPES[0], frequency: '', responsible_worker: '', start_date: todayISO(), review_date: '' }

function labelFor(domains, key) {
  return domains.find((d) => d.key === key)?.label ?? key
}

function AssessmentCard({ assessment, canDelete, onDeleted }) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [removing, setRemoving] = useState(false)
  const assessorName = assessment.assessor
    ? [assessment.assessor.first_name, assessment.assessor.last_name].filter(Boolean).join(' ')
    : null

  const handleRemove = async () => {
    if (!window.confirm(`Delete this ${assessment.assessment_type} assessment from ${assessment.assessment_date}? This cannot be undone.`)) return
    setRemoving(true)
    try {
      await deleteAssessment(assessment.id)
      toast.success('Assessment deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemoving(false)
    }
  }

  const riskEntries = Object.entries(assessment.risk_ratings || {})
  const needsEntries = Object.entries(assessment.needs_ratings || {})
  const sewbEntries = Object.entries(assessment.sewb_scores || {})

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone={TYPE_TONE[assessment.assessment_type] ?? 'neutral'}>{assessment.assessment_type}</StatusPill>
          <span style={{ fontWeight: 600 }}>{assessment.assessment_date}</span>
          {assessment.overall_risk_level && (
            <StatusPill tone={RISK_TONE[assessment.overall_risk_level] ?? 'neutral'}>Risk: {assessment.overall_risk_level}</StatusPill>
          )}
          {assessment.progress_status && (
            <StatusPill tone={PROGRESS_TONE[assessment.progress_status] ?? 'neutral'}>{assessment.progress_status}</StatusPill>
          )}
          {assessment.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
        </div>
        <span>{assessorName ? `Assessed by ${assessorName}` : ''}</span>
      </div>

      <button type="button" className="link-button" style={{ marginTop: 8 }} onClick={() => setExpanded((v) => !v)}>
        {expanded ? <ChevronUp strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} /> : <ChevronDown strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />}
        {expanded ? 'Hide details' : 'View details'}
      </button>

      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assessment.primary_program && <div className="data-cell-muted">Primary program: {assessment.primary_program}</div>}
          {assessment.funding_source && <div className="data-cell-muted">Funding source: {assessment.funding_source}</div>}
          {(assessment.presenting_issues || []).length > 0 && (
            <div>
              <div className="details-field-label">Presenting Issues</div>
              <div className="data-cell-muted">{assessment.presenting_issues.join(', ')}</div>
            </div>
          )}
          {riskEntries.length > 0 && (
            <div>
              <div className="details-field-label">Risk Ratings</div>
              <div className="data-cell-muted">
                {riskEntries.map(([k, v]) => `${labelFor(RISK_DOMAINS, k)}: ${v}`).join(' · ')}
              </div>
            </div>
          )}
          {needsEntries.length > 0 && (
            <div>
              <div className="details-field-label">Needs Ratings</div>
              <div className="data-cell-muted">
                {needsEntries.map(([k, v]) => `${labelFor(NEEDS_DOMAINS, k)}: ${v}`).join(' · ')}
              </div>
            </div>
          )}
          {(assessment.protective_factors || []).length > 0 && (
            <div>
              <div className="details-field-label">Protective Factors</div>
              <div className="data-cell-muted">{assessment.protective_factors.join(', ')}</div>
            </div>
          )}
          {sewbEntries.length > 0 && (
            <div>
              <div className="details-field-label">SEWB Scores</div>
              <div className="data-cell-muted">
                {sewbEntries.map(([k, v]) => `${labelFor(SEWB_DOMAINS, k)}: ${v}/5`).join(' · ')}
              </div>
            </div>
          )}
          {(assessment.engagement_rating || assessment.attendance_rating) && (
            <div className="data-cell-muted">
              {assessment.engagement_rating && `Engagement: ${assessment.engagement_rating}`}
              {assessment.engagement_rating && assessment.attendance_rating && ' · '}
              {assessment.attendance_rating && `Attendance: ${assessment.attendance_rating}`}
            </div>
          )}
          {assessment.review_notes && <div className="note-item-text">{assessment.review_notes}</div>}
          {assessment.exit_reason && <div className="data-cell-muted">Reason for exit: {assessment.exit_reason}</div>}
          {assessment.goals_achieved && <div className="data-cell-muted">Goals achieved: {assessment.goals_achieved}</div>}
          {[
            ['Education', assessment.education_outcome],
            ['Employment', assessment.employment_outcome],
            ['Housing', assessment.housing_outcome],
            ['Cultural', assessment.cultural_outcome],
            ['Wellbeing', assessment.wellbeing_outcome],
          ]
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <div className="data-cell-muted" key={label}>
                {label} outcome: {v}
              </div>
            ))}
          {assessment.referral_to_ongoing_supports && (
            <div className="data-cell-muted">Referred to: {assessment.referral_to_ongoing_supports}</div>
          )}
          {assessment.staff_summary && <div className="note-item-text">{assessment.staff_summary}</div>}
          {canDelete && (
            <button type="button" className="link-button" style={{ color: '#f87171', alignSelf: 'flex-start' }} onClick={handleRemove} disabled={removing}>
              <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              {removing ? 'Deleting...' : 'Delete Assessment'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ServicePlanSection({ clientId, workers }) {
  const { user } = useAuth()
  const toast = useToast()
  const { items, loading, refetch } = useServicePlanItems(clientId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyServiceForm)
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createServicePlanItem({
        client_id: clientId,
        service_type: form.service_type,
        frequency: form.frequency.trim() || null,
        responsible_worker: form.responsible_worker || null,
        start_date: form.start_date,
        review_date: form.review_date || null,
        created_by: user?.id,
      })
      toast.success('Service added to plan.')
      setForm(emptyServiceForm)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnd = async (item) => {
    try {
      await updateServicePlanItemStatus(item.id, 'Ended')
      toast.success('Service marked ended.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-head">
        <div>
          <div className="section-title">Section 8 · Service Plan</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${items.length} ${items.length === 1 ? 'service' : 'services'} on this client's plan`}</div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Service
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="sp-type">
                  Service
                </label>
                <select id="sp-type" className="input" value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}>
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sp-frequency">
                  Frequency
                </label>
                <input id="sp-frequency" className="input" placeholder="e.g. Weekly" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" htmlFor="sp-worker">
                  Responsible Worker
                </label>
                <select id="sp-worker" className="input" value={form.responsible_worker} onChange={(e) => setForm((f) => ({ ...f, responsible_worker: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sp-start">
                  Start Date
                </label>
                <input id="sp-start" type="date" className="input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label" htmlFor="sp-review">
                  Review Date
                </label>
                <input id="sp-review" type="date" className="input" value={form.review_date} onChange={(e) => setForm((f) => ({ ...f, review_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && items.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={ClipboardCheck} title="Loading..." text="Fetching this client's service plan." />
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No services planned yet" text="Services agreed for this client (mentoring, case management, camps, etc.) will appear here." />
        ) : (
          <div className="note-list">
            {items.map((item) => {
              const workerName = item.worker ? [item.worker.first_name, item.worker.last_name].filter(Boolean).join(' ') : 'Unassigned'
              return (
                <div className="note-item" key={item.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{item.service_type}</span>
                      <StatusPill tone={item.status === 'Active' ? 'success' : 'neutral'}>{item.status}</StatusPill>
                    </div>
                    <span>{item.frequency || 'No set frequency'}</span>
                  </div>
                  <div className="data-cell-muted">
                    {workerName} · Started {item.start_date}{item.review_date ? ` · Review ${item.review_date}` : ''}
                  </div>
                  {item.status === 'Active' && (
                    <button type="button" className="link-button" style={{ marginTop: 6 }} onClick={() => handleEnd(item)}>
                      Mark Ended
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function ClientAssessmentsPanel({ clientId, clientName, nextReviewDate, onReviewDateChange }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { assessments, loading, error, refetch } = useClientAssessments(clientId)
  const [workers, setWorkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canDelete = profile?.role === 'administrator' || profile?.role === 'manager'
  const reviewOverdue = nextReviewDate && nextReviewDate < todayISO()

  useEffect(() => {
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleSave = async ({ next_review_date, ...assessmentPayload }) => {
    setSubmitting(true)
    try {
      await createAssessment({ ...assessmentPayload, created_by: user?.id })
      const newReviewDate = assessmentPayload.assessment_type === 'Exit' ? null : next_review_date || null
      await updateNextReviewDate(clientId, newReviewDate)
      onReviewDateChange?.(newReviewDate)
      toast.success('Assessment saved.')
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Pre &amp; Post Assessments</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${assessments.length} ${assessments.length === 1 ? 'assessment' : 'assessments'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          New Assessment
        </Button>
      </div>

      {nextReviewDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <StatusPill tone={reviewOverdue ? 'danger' : 'info'}>
            <CalendarClock strokeWidth={2} style={{ width: 12, height: 12, marginRight: 4, verticalAlign: 'text-bottom' }} />
            {reviewOverdue ? 'Review overdue' : 'Next review due'}: {nextReviewDate}
          </StatusPill>
        </div>
      )}

      {showForm && (
        <AssessmentForm
          clientId={clientId}
          workers={workers}
          currentUserId={user?.id}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      <Card style={!loading && assessments.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={ClipboardCheck} title="Loading..." text="Fetching assessments for this client." />
        ) : error ? (
          <EmptyState icon={ClipboardCheck} title="Couldn't load assessments" text={error} />
        ) : assessments.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No assessments recorded yet"
            text="Intake, review, and exit assessments (risk, needs, SEWB, and outcomes) will appear here."
          />
        ) : (
          <div className="note-list">
            {assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} canDelete={canDelete} onDeleted={refetch} />
            ))}
          </div>
        )}
      </Card>

      <ServicePlanSection clientId={clientId} workers={workers} />
    </div>
  )
}
