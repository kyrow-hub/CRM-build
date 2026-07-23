import { useEffect, useState } from 'react'
import { Plus, ShieldAlert, Tent, X } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useProgramRiskAssessments } from '../../hooks/useProgramRiskAssessments.js'
import { listCampSessions, createProgramRiskAssessment, deleteProgramRiskAssessment } from '../../services/programRiskAssessmentService.js'
import { listAssignableWorkers } from '../../services/clientService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const RISK_TONE = { Low: 'success', Medium: 'warning', High: 'danger' }
const ANNUAL_DAYS = 365
const DUE_SOON_DAYS = 30

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 3600 * 1000))

const emptyForm = { assessment_date: todayISO(), assessor_id: '', overall_risk_rating: '', hazards_identified: '', control_measures: '', notes: '' }

function RiskAssessmentForm({ workers, onSave, onCancel, submitting }) {
  const [form, setForm] = useState(emptyForm)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Card style={{ marginTop: 10, marginBottom: 10 }}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="ra-date">
              Assessment Date
            </label>
            <input
              id="ra-date"
              type="date"
              className="input"
              value={form.assessment_date}
              onChange={(e) => setForm((f) => ({ ...f, assessment_date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="ra-assessor">
              Assessor
            </label>
            <select id="ra-assessor" className="input" value={form.assessor_id} onChange={(e) => setForm((f) => ({ ...f, assessor_id: e.target.value }))}>
              <option value="">Select...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="ra-rating">
              Overall Risk Rating
            </label>
            <select id="ra-rating" className="input" value={form.overall_risk_rating} onChange={(e) => setForm((f) => ({ ...f, overall_risk_rating: e.target.value }))}>
              <option value="">Select...</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label" htmlFor="ra-hazards">
            Hazards Identified
          </label>
          <textarea
            id="ra-hazards"
            className="input"
            rows={2}
            value={form.hazards_identified}
            onChange={(e) => setForm((f) => ({ ...f, hazards_identified: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label" htmlFor="ra-controls">
            Control Measures
          </label>
          <textarea
            id="ra-controls"
            className="input"
            rows={2}
            value={form.control_measures}
            onChange={(e) => setForm((f) => ({ ...f, control_measures: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label" htmlFor="ra-notes">
            Notes
          </label>
          <textarea id="ra-notes" className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Assessment'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function RiskAssessmentsPanel({ programs }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { assessments, loading, error, refetch } = useProgramRiskAssessments()
  const [campSessions, setCampSessions] = useState([])
  const [campSessionsLoading, setCampSessionsLoading] = useState(true)
  const [workers, setWorkers] = useState([])
  const [addingFor, setAddingFor] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const canDelete = profile?.role === 'administrator' || profile?.role === 'manager'

  const loadCampSessions = () => {
    setCampSessionsLoading(true)
    listCampSessions()
      .then(setCampSessions)
      .catch(() => setCampSessions([]))
      .finally(() => setCampSessionsLoading(false))
  }

  useEffect(() => {
    loadCampSessions()
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const programAssessments = assessments.filter((a) => !a.session_id)
  const campAssessments = assessments.filter((a) => a.session_id)

  const handleSave = async (programId, sessionId, form) => {
    setSubmitting(true)
    try {
      await createProgramRiskAssessment({
        program_id: programId,
        session_id: sessionId,
        assessment_date: form.assessment_date,
        assessor_id: form.assessor_id || null,
        overall_risk_rating: form.overall_risk_rating || null,
        hazards_identified: form.hazards_identified.trim() || null,
        control_measures: form.control_measures.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      })
      toast.success('Risk assessment saved.')
      setAddingFor(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (assessment) => {
    if (!window.confirm('Delete this risk assessment? This cannot be undone.')) return
    try {
      await deleteProgramRiskAssessment(assessment.id)
      toast.success('Risk assessment deleted.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const programStatus = (programId) => {
    const forProgram = programAssessments.filter((a) => a.program_id === programId).sort((a, b) => (a.assessment_date < b.assessment_date ? 1 : -1))
    if (forProgram.length === 0) return { status: 'missing', latest: null }
    const latest = forProgram[0]
    const age = daysAgo(latest.assessment_date)
    if (age > ANNUAL_DAYS) return { status: 'overdue', latest }
    if (age > ANNUAL_DAYS - DUE_SOON_DAYS) return { status: 'due-soon', latest }
    return { status: 'current', latest }
  }

  const STATUS_LABEL = { current: 'Current', 'due-soon': 'Due Soon', overdue: 'Overdue', missing: 'Missing' }
  const STATUS_TONE = { current: 'success', 'due-soon': 'warning', overdue: 'danger', missing: 'danger' }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Risk Assessments</div>
          <div className="section-subtitle">Programs and activities are assessed annually; every camp needs its own assessment.</div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="section-subtitle" style={{ marginBottom: 10, fontWeight: 700, color: 'var(--text)' }}>
          Programs &amp; Activities (Annual)
        </div>
        <Card style={programs.length === 0 ? undefined : { padding: 0 }}>
          {loading ? (
            <EmptyState icon={ShieldAlert} title="Loading..." text="Fetching program risk assessments." />
          ) : error ? (
            <EmptyState icon={ShieldAlert} title="Couldn't load risk assessments" text={error} />
          ) : programs.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No programs yet" text="Add a program from the Register tab first." />
          ) : (
            <div className="note-list">
              {programs.map((program) => {
                const { status, latest } = programStatus(program.id)
                return (
                  <div className="note-item" key={program.id}>
                    <div className="note-item-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{program.name}</span>
                        <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>
                      </div>
                      <span>{latest ? `Last assessed ${latest.assessment_date}` : 'Never assessed'}</span>
                    </div>
                    {latest?.overall_risk_rating && (
                      <div className="data-cell-muted">
                        Overall risk: <StatusPill tone={RISK_TONE[latest.overall_risk_rating] ?? 'neutral'}>{latest.overall_risk_rating}</StatusPill>
                      </div>
                    )}
                    {latest?.hazards_identified && <div className="note-item-text">{latest.hazards_identified}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setAddingFor(addingFor?.type === 'program' && addingFor.id === program.id ? null : { type: 'program', id: program.id })}
                      >
                        <Plus strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                        Add Assessment
                      </button>
                      {canDelete && latest && (
                        <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={() => handleDelete(latest)}>
                          <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Delete Latest
                        </button>
                      )}
                    </div>
                    {addingFor?.type === 'program' && addingFor.id === program.id && (
                      <RiskAssessmentForm
                        workers={workers}
                        submitting={submitting}
                        onCancel={() => setAddingFor(null)}
                        onSave={(form) => handleSave(program.id, null, form)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="section-subtitle" style={{ marginBottom: 10, fontWeight: 700, color: 'var(--text)' }}>
          Camps (Every Camp)
        </div>
        <Card style={campSessions.length === 0 ? undefined : { padding: 0 }}>
          {campSessionsLoading || loading ? (
            <EmptyState icon={Tent} title="Loading..." text="Fetching camp sessions." />
          ) : campSessions.length === 0 ? (
            <EmptyState icon={Tent} title="No camps recorded yet" text="Sessions marked as an overnight camp in the Register tab will appear here." />
          ) : (
            <div className="note-list">
              {campSessions.map((session) => {
                const sessionAssessment = campAssessments.find((a) => a.session_id === session.id)
                return (
                  <div className="note-item" key={session.id}>
                    <div className="note-item-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{session.program?.name ?? 'Program'}</span>
                        <StatusPill tone={sessionAssessment ? 'success' : 'danger'}>{sessionAssessment ? 'Complete' : 'Missing'}</StatusPill>
                      </div>
                      <span>{session.session_date}{session.location ? ` · ${session.location}` : ''}</span>
                    </div>
                    {sessionAssessment?.overall_risk_rating && (
                      <div className="data-cell-muted">
                        Overall risk: <StatusPill tone={RISK_TONE[sessionAssessment.overall_risk_rating] ?? 'neutral'}>{sessionAssessment.overall_risk_rating}</StatusPill>
                      </div>
                    )}
                    {sessionAssessment?.hazards_identified && <div className="note-item-text">{sessionAssessment.hazards_identified}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setAddingFor(addingFor?.type === 'camp' && addingFor.id === session.id ? null : { type: 'camp', id: session.id })}
                      >
                        <Plus strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {sessionAssessment ? 'Add Another' : 'Add Assessment'}
                      </button>
                      {canDelete && sessionAssessment && (
                        <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={() => handleDelete(sessionAssessment)}>
                          <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Delete
                        </button>
                      )}
                    </div>
                    {addingFor?.type === 'camp' && addingFor.id === session.id && (
                      <RiskAssessmentForm
                        workers={workers}
                        submitting={submitting}
                        onCancel={() => setAddingFor(null)}
                        onSave={(form) => handleSave(session.program.id, session.id, form)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
