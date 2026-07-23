import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, AlertTriangle, Check, X, Wand2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { computeClientCompliance, generateComplianceTasks } from '../../services/complianceService.js'
import { listClientDocuments } from '../../services/documentService.js'
import { listClientAssessments } from '../../services/assessmentService.js'
import { listClientGoals } from '../../services/clientGoalService.js'
import { listServicePlanItems } from '../../services/servicePlanService.js'
import { listClientNotes } from '../../services/clientNoteService.js'
import { listClientCaseActivities } from '../../services/caseActivityService.js'
import { listAttendanceRecordsForClient } from '../../services/attendanceService.js'
import { listReferralsForClient } from '../../services/referralService.js'
import { listClientRelationships } from '../../services/relationshipService.js'
import { listClientFollowUps } from '../../services/followUpService.js'
import { listIncidentsForClient } from '../../services/incidentService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const STATUS_TONE = { Compliant: 'success', 'Attention Required': 'warning', 'Non-Compliant': 'danger' }
const STATUS_ICON = { Compliant: ShieldCheck, 'Attention Required': ShieldAlert, 'Non-Compliant': ShieldAlert }
const ALERT_TONE = { red: 'danger', yellow: 'warning', green: 'success' }

export default function ClientCompliancePanel({ client, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [compliance, setCompliance] = useState(null)
  const [followUps, setFollowUps] = useState([])
  const [generating, setGenerating] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      listClientDocuments(client.id),
      listClientAssessments(client.id),
      listClientGoals(client.id),
      listServicePlanItems(client.id),
      listClientNotes(client.id),
      listClientCaseActivities(client.id),
      listAttendanceRecordsForClient(client.id),
      listReferralsForClient(client.id),
      listClientRelationships(client.id),
      listClientFollowUps(client.id),
      listIncidentsForClient(client.id),
    ])
      .then(([documents, assessments, goals, servicePlanItems, notes, activities, attendance, referrals, relationships, followUpsResult, incidents]) => {
        setCompliance(
          computeClientCompliance({
            client,
            documents,
            assessments,
            goals,
            servicePlanItems,
            notes,
            activities,
            attendance,
            referrals,
            relationships,
            followUps: followUpsResult,
            incidents,
          }),
        )
        setFollowUps(followUpsResult)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [client.id])

  const handleGenerateTasks = async () => {
    setGenerating(true)
    try {
      const count = await generateComplianceTasks({ client, compliance, existingFollowUps: followUps, createdBy: user?.id })
      if (count === 0) {
        toast.success('No new tasks needed - everything outstanding already has a follow-up.')
      } else {
        toast.success(`Created ${count} task${count === 1 ? '' : 's'} in Follow Ups.`)
      }
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <EmptyState icon={ShieldCheck} title="Loading..." text="Calculating compliance for this client." />
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <EmptyState icon={ShieldCheck} title="Couldn't load compliance" text={error} />
      </Card>
    )
  }

  const StatusIcon = STATUS_ICON[compliance.status]

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Compliance</div>
          <div className="section-subtitle">Automated compliance status for {clientName}</div>
        </div>
        <Button onClick={handleGenerateTasks} disabled={generating}>
          <Wand2 strokeWidth={2} />
          {generating ? 'Generating...' : 'Generate Tasks'}
        </Button>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className={`stat-card-icon stat-card-icon--${compliance.status === 'Compliant' ? 'green' : compliance.status === 'Attention Required' ? 'yellow' : 'red'}`} style={{ width: 48, height: 48 }}>
            <StatusIcon strokeWidth={2} style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="stat-card-value" style={{ fontSize: 28 }}>
                {compliance.score}%
              </span>
              <StatusPill tone={STATUS_TONE[compliance.status]}>{compliance.status}</StatusPill>
            </div>
            <div className="data-cell-muted">Overall Compliance Score</div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 18 }}>
        <div className="section-subtitle" style={{ marginBottom: 12, fontWeight: 700, color: 'var(--text)' }}>
          Compliance Alerts
        </div>
        {compliance.alerts.length === 0 ? (
          <div className="data-cell-muted">No alerts.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {compliance.alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <StatusPill tone={ALERT_TONE[alert.tone]}>{alert.label}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="details-grid">
        {compliance.sections.map((section) => {
          const applicableChecks = section.checks.filter((c) => c.applicable !== false)
          return (
            <Card key={section.key}>
              <div className="section-subtitle" style={{ marginBottom: 10, fontWeight: 700, color: 'var(--text)' }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {applicableChecks.map((check) => (
                  <div key={check.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    {check.pass ? (
                      <Check strokeWidth={2.5} style={{ width: 15, height: 15, color: '#4ade80', flexShrink: 0 }} />
                    ) : (
                      <X strokeWidth={2.5} style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
                    )}
                    <span style={{ color: check.pass ? 'var(--text)' : 'var(--muted)' }}>
                      {check.label}
                      {check.status && ` (${check.status.replace('-', ' ')})`}
                    </span>
                  </div>
                ))}
                {applicableChecks.length === 0 && <div className="data-cell-muted">Not applicable.</div>}
              </div>
            </Card>
          )
        })}
      </div>

      {(compliance.isHighRisk || compliance.referredByYouthJustice) && (
        <Card style={{ marginTop: 18, borderColor: 'rgba(250, 204, 21, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}>
            <AlertTriangle strokeWidth={2} style={{ width: 16, height: 16, color: '#facc15' }} />
            Smart Rule Notes
          </div>
          {compliance.isHighRisk && (
            <div className="data-cell-muted">High risk client - confirm a Risk Management Plan is in place and manager review has occurred (not tracked in the CRM yet).</div>
          )}
          {compliance.referredByYouthJustice && (
            <div className="data-cell-muted">Referred by Youth Justice - confirm Youth Justice documentation is on file (not tracked in the CRM yet).</div>
          )}
        </Card>
      )}
    </div>
  )
}
