import { listClientsForCompliance } from './clientService.js'
import { listAllDocuments } from './documentService.js'
import { listAllAssessments, listClientAssessments } from './assessmentService.js'
import { listAllClientGoals } from './clientGoalService.js'
import { listAllServicePlanItems } from './servicePlanService.js'
import { listAllClientNotes, listClientNotes } from './clientNoteService.js'
import { listAllCaseActivities } from './caseActivityService.js'
import { listAllAttendanceForCompliance } from './attendanceService.js'
import { listReferrals, listReferralsForClient } from './referralService.js'
import { listAllRelationships } from './relationshipService.js'
import { listAllFollowUps, createFollowUp } from './followUpService.js'
import { listAllIncidents } from './incidentService.js'
import { CORE_MANDATORY_DOCUMENT_TYPES, ACTIVITY_ONLY_MANDATORY_DOCUMENT_TYPES } from '../data/documentTypes.js'

const GUARDIAN_RELATIONSHIP_TYPES = ['Mother', 'Father', 'Guardian', 'Grandmother', 'Grandfather', 'Foster Carer']

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function calculateAge(dob) {
  if (!dob) return null
  const diffMs = Date.now() - new Date(dob).getTime()
  return Math.floor(diffMs / (365.25 * 24 * 3600 * 1000))
}

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 3600 * 1000))
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (24 * 3600 * 1000))
}

const docKey = (type) => `doc_${type.replace(/\s+/g, '_')}`

function mostRecentDocumentDate(documents, type) {
  const matches = documents.filter((d) => d.document_type === type)
  if (matches.length === 0) return null
  return matches.reduce((latest, d) => (d.created_at > latest ? d.created_at : latest), matches[0].created_at)
}

const CONSENT_FORM_RENEWAL_DAYS = 365

// Pure compliance calculation for one client. Every array argument should
// already be filtered/scoped to this client. Covers spec Sections 1-7 and
// 9 (Client Details, Mandatory Documents, Assessments, Reviews, Service
// Delivery, Goals, Referrals, Exit) plus the Smart Rules that have a real
// data source to check.
//
// Deliberately not covered (no supporting data model exists yet):
// - Section 8 Incident Management - there is no incidents table/workflow
//   in the app at all.
// - Risk Review / Goal Review / Support Plan Review as separate 90-day
//   cycles - they currently share the single clients.next_review_date set
//   by Intake/Review assessments, rather than being tracked individually.
// - Transport Consent as a Smart Rule - nothing records whether transport
//   was actually provided, so it's a selectable document type but not
//   auto-required.
// - "Manager approval" / "Risk Management Plan" for high-risk clients -
//   surfaced as an informational alert only, since neither is a trackable
//   record in the current schema.
//
// Activity Only clients (client.client_type === 'activity_only') get a
// deliberately reduced version of all of the above: they aren't case
// managed, so client details/assessments/reviews/service delivery/goals
// sections don't apply to them at all, and Section 2 (Mandatory Documents)
// only requires the four core documents rather than the full set. Referrals
// and Incident Management still apply if the client happens to have any,
// since those aren't case-management-specific.
export function computeClientCompliance({
  client,
  documents = [],
  assessments = [],
  goals = [],
  servicePlanItems = [],
  notes = [],
  activities = [],
  attendance = [],
  referrals = [],
  relationships = [],
  followUps = [],
  incidents = [],
}) {
  const today = todayISO()
  const age = calculateAge(client.date_of_birth)
  const isMinor = age != null && age < 18
  const attendedCamp = attendance.some((a) => a.session?.overnight_camp && a.attendance_status === 'Present')
  const documentTypesOnFile = new Set(documents.map((d) => d.document_type).filter(Boolean))
  const isHighRisk = client.risk_level === 'High' || assessments.some((a) => a.overall_risk_level === 'High')
  const referredByYouthJustice =
    (client.referral_source || '').toLowerCase().includes('youth justice') ||
    referrals.some((r) => (r.referral_source || '').toLowerCase().includes('youth justice'))
  const isClosed = client.status === 'closed' || client.status === 'archived' || Boolean(client.archived_at)
  const isActivityOnly = client.client_type === 'activity_only'

  const sections = []

  // Section 1: Client Details - not applicable to Activity Only clients.
  if (!isActivityOnly) {
    sections.push({
      key: 'client_details',
      title: 'Client Details',
      severity: 'critical',
      checks: [
        {
          key: 'participant_details',
          label: 'Participant details complete',
          pass: Boolean(client.first_name && client.last_name && client.date_of_birth && client.gender && client.address),
        },
        {
          key: 'emergency_contact',
          label: 'Emergency contact entered',
          pass: Boolean(client.emergency_contact_name && client.emergency_contact_phone) || relationships.some((r) => r.is_primary_contact),
        },
        {
          key: 'guardian_details',
          label: 'Parent/Guardian details completed (if under 18)',
          pass: !isMinor || relationships.some((r) => GUARDIAN_RELATIONSHIP_TYPES.includes(r.relationship_type)),
          applicable: isMinor,
        },
        {
          key: 'cultural_identity',
          label: 'Cultural identity recorded',
          pass: Boolean(client.indigenous_status || client.cultural_background),
        },
        {
          key: 'funding_program',
          label: 'Funding program assigned',
          pass: assessments.some((a) => a.primary_program || a.funding_source),
        },
        { key: 'case_worker', label: 'Assigned case worker', pass: Boolean(client.assigned_worker_id) },
      ],
    })
  }

  // Section 2: Mandatory Documents. Consent Form must be renewed every 12
  // months (not just present once), per the annual-renewal requirement -
  // every other core document just needs to exist. Activity Only clients
  // only need the reduced four-document set.
  const mandatoryDocumentTypes = isActivityOnly ? ACTIVITY_ONLY_MANDATORY_DOCUMENT_TYPES : CORE_MANDATORY_DOCUMENT_TYPES
  const consentFormDate = mostRecentDocumentDate(documents, 'Consent Form')
  const consentFormCurrent = Boolean(consentFormDate) && daysAgo(consentFormDate) <= CONSENT_FORM_RENEWAL_DAYS
  const documentChecks = mandatoryDocumentTypes.map((type) =>
    type === 'Consent Form'
      ? {
          key: docKey(type),
          label: consentFormDate && !consentFormCurrent ? 'Consent Form (expired - renew annually)' : 'Consent Form (renewed within 12 months)',
          pass: consentFormCurrent,
        }
      : { key: docKey(type), label: type, pass: documentTypesOnFile.has(type) },
  )
  documentChecks.push({
    key: docKey('Camp Consent'),
    label: 'Camp Consent (attended a camp)',
    pass: !attendedCamp || documentTypesOnFile.has('Camp Consent'),
    applicable: attendedCamp,
  })
  sections.push({ key: 'documents', title: 'Mandatory Documents', severity: 'critical', checks: documentChecks })

  // Section 3: Assessments - not applicable to Activity Only clients.
  if (!isActivityOnly) {
    sections.push({
      key: 'assessments',
      title: 'Assessments',
      severity: 'critical',
      checks: [
        { key: 'intake_assessment', label: 'Intake Assessment', pass: assessments.some((a) => a.assessment_type === 'Intake') },
        { key: 'risk_assessment', label: 'Risk Assessment', pass: assessments.some((a) => a.overall_risk_level) },
        {
          key: 'needs_assessment',
          label: 'Needs Assessment',
          pass: assessments.some((a) => a.needs_ratings && Object.keys(a.needs_ratings).length > 0),
        },
        {
          key: 'sewb_assessment',
          label: 'SEWB Assessment',
          pass: assessments.some((a) => a.sewb_scores && Object.keys(a.sewb_scores).length > 0),
        },
        { key: 'initial_goals', label: 'Initial Goals completed', pass: goals.length > 0 },
        { key: 'support_plan', label: 'Individual Support Plan', pass: servicePlanItems.length > 0 },
      ],
    })
  }

  // Section 4: Reviews - only the 90-day review cycle is independently
  // tracked today (see module note above). Not applicable to Activity
  // Only clients, who aren't on a case-review cycle.
  let reviewStatus = 'none'
  if (!isActivityOnly) {
    if (client.next_review_date) {
      if (client.next_review_date < today) reviewStatus = 'overdue'
      else if (daysUntil(client.next_review_date) <= 14) reviewStatus = 'due-soon'
      else reviewStatus = 'current'
    }
    sections.push({
      key: 'reviews',
      title: 'Reviews',
      severity: 'review',
      checks: [
        {
          key: 'review_90_day',
          label: '90-Day Review',
          pass: reviewStatus === 'current' || reviewStatus === 'due-soon',
          status: reviewStatus,
        },
      ],
    })
  }

  // Section 5: Service Delivery - not applicable to Activity Only clients.
  let lastServiceDays = Infinity
  let inactiveClient = false
  if (!isActivityOnly) {
    lastServiceDays = Math.min(
      Infinity,
      ...notes.map((n) => daysAgo(n.note_date)),
      ...activities.map((a) => daysAgo(a.activity_date)),
      ...attendance.map((a) => daysAgo(a.session?.session_date)),
    )
    inactiveClient = !isClosed && lastServiceDays > 30
    sections.push({
      key: 'service_delivery',
      title: 'Service Delivery',
      severity: 'attention',
      checks: [
        { key: 'service_30_days', label: 'Service delivered within last 30 days', pass: lastServiceDays <= 30 },
        { key: 'case_note', label: 'Case note entered', pass: notes.length > 0 },
        { key: 'attendance_recorded', label: 'Attendance recorded', pass: attendance.length > 0 },
        { key: 'group_notes', label: 'Group notes completed', pass: notes.some((n) => n.is_group_note) },
        {
          key: 'follow_ups',
          label: 'Follow-up actions completed',
          pass: !followUps.some((f) => f.status === 'Pending' && f.due_date < today),
        },
      ],
    })
  }

  // Section 6: Goals - not applicable to Activity Only clients.
  if (!isActivityOnly) {
    sections.push({
      key: 'goals',
      title: 'Goals',
      severity: 'attention',
      checks: [
        {
          key: 'active_goal',
          label: 'At least one active goal',
          pass: goals.some((g) => g.status === 'Not Started' || g.status === 'In Progress'),
        },
        { key: 'goal_review', label: 'Goal review completed', pass: goals.some((g) => g.notes) },
        {
          key: 'goal_outcome',
          label: 'Goal outcome recorded',
          pass: goals.some((g) => g.status === 'Achieved' || g.status === 'Not Achieved'),
        },
      ],
    })
  }

  // Section 7: Referrals - only relevant if the client has any
  if (referrals.length > 0) {
    sections.push({
      key: 'referrals',
      title: 'Referrals',
      severity: 'attention',
      checks: [
        {
          key: 'referral_resolved',
          label: 'All referrals resolved (accepted or declined)',
          pass: referrals.every((r) => r.status !== 'Received'),
        },
      ],
    })
  }

  // Section 8: Incident Management - only relevant if the client has any.
  // A client is never blocked from being compliant just for having an
  // incident; what matters is whether every incident is being worked
  // through (reviewed, followed up, resolved), same as the app-level rule
  // that an incident itself can't be closed until all three are done.
  if (incidents.length > 0) {
    sections.push({
      key: 'incidents',
      title: 'Incident Management',
      severity: 'critical',
      checks: [
        { key: 'incident_reviewed', label: 'All incidents reviewed by a manager', pass: incidents.every((i) => i.manager_reviewed) },
        { key: 'incident_follow_up', label: 'All incidents have follow-up completed', pass: incidents.every((i) => i.follow_up_completed) },
        { key: 'incident_outcome', label: 'All incidents have an outcome recorded', pass: incidents.every((i) => Boolean(i.outcome)) },
      ],
    })
  }

  // Section 9: Exit - computed always (so it can gate the Archive action
  // before status actually changes) but only shown/scored once the client
  // is closed/archived. Not applicable to Activity Only clients (no
  // assessments were ever required of them, so an Exit Assessment can't
  // be either) - exitChecks is left empty, which makes exitReady trivially
  // true for them.
  const exitAssessment = [...assessments].reverse().find((a) => a.assessment_type === 'Exit')
  const exitChecks = isActivityOnly
    ? []
    : [
        { key: 'exit_assessment', label: 'Exit Assessment', pass: Boolean(exitAssessment) },
        { key: 'exit_reason', label: 'Exit Reason', pass: Boolean(client.exit_reason) },
        {
          key: 'exit_outcome',
          label: 'Outcome recorded',
          pass: Boolean(
            exitAssessment &&
              (exitAssessment.education_outcome ||
                exitAssessment.employment_outcome ||
                exitAssessment.housing_outcome ||
                exitAssessment.cultural_outcome ||
                exitAssessment.wellbeing_outcome),
          ),
        },
        { key: 'final_case_note', label: 'Final Case Note', pass: notes.length > 0 },
        {
          key: 'referral_completed',
          label: 'Referral completed (if applicable)',
          pass: referrals.length === 0 || referrals.every((r) => r.status !== 'Received'),
        },
      ]
  if (isClosed && !isActivityOnly) {
    sections.push({ key: 'exit', title: 'Exit', severity: 'critical', checks: exitChecks })
  }

  // Flatten for scoring
  const checksByKey = {}
  for (const section of sections) {
    for (const check of section.checks) checksByKey[check.key] = check
  }
  const scorable = sections.flatMap((s) => s.checks.filter((c) => c.applicable !== false))
  const score = scorable.length ? Math.round((scorable.filter((c) => c.pass).length / scorable.length) * 100) : 100

  const criticalFailures = sections
    .filter((s) => s.severity === 'critical')
    .flatMap((s) => s.checks.filter((c) => c.applicable !== false && !c.pass))
  const attentionFailures = sections
    .filter((s) => s.severity === 'attention')
    .flatMap((s) => s.checks.filter((c) => c.applicable !== false && !c.pass))

  let status
  if (criticalFailures.length > 0 || reviewStatus === 'overdue' || inactiveClient) status = 'Non-Compliant'
  else if (attentionFailures.length > 0 || reviewStatus === 'due-soon') status = 'Attention Required'
  else status = 'Compliant'

  // Alerts
  const alerts = []
  for (const section of sections) {
    if (section.key === 'reviews') continue
    for (const check of section.checks) {
      if (check.applicable === false || check.pass) continue
      alerts.push({ tone: section.severity === 'critical' ? 'red' : 'yellow', label: `${check.label} Missing` })
    }
  }
  if (reviewStatus === 'overdue') alerts.push({ tone: 'red', label: '90-Day Review Overdue' })
  else if (reviewStatus === 'due-soon') alerts.push({ tone: 'yellow', label: `90-Day Review Due ${client.next_review_date}` })
  else if (reviewStatus === 'current') alerts.push({ tone: 'green', label: '90-Day Review Current' })

  if (inactiveClient) {
    alerts.push({
      tone: 'red',
      label: lastServiceDays === Infinity ? 'No Service Recorded - Inactive Client' : `No Case Note for ${lastServiceDays} Days - Inactive Client`,
    })
  }
  if (isHighRisk) alerts.push({ tone: 'yellow', label: 'High Risk - confirm Risk Management Plan and manager review' })
  if (referredByYouthJustice) alerts.push({ tone: 'yellow', label: 'Referred by Youth Justice - confirm Youth Justice documentation on file' })

  for (const section of sections) {
    if (section.key === 'reviews') continue
    const applicableChecks = section.checks.filter((c) => c.applicable !== false)
    if (applicableChecks.length > 0 && applicableChecks.every((c) => c.pass)) {
      alerts.push({ tone: 'green', label: `${section.title} Complete` })
    }
  }

  const tonePriority = { red: 0, yellow: 1, green: 2 }
  alerts.sort((a, b) => tonePriority[a.tone] - tonePriority[b.tone])

  return {
    score,
    status,
    sections,
    checksByKey,
    alerts,
    reviewStatus,
    inactiveClient,
    isHighRisk,
    referredByYouthJustice,
    lastServiceDays,
    exitChecks,
    exitReady: exitChecks.every((c) => c.pass),
  }
}

function groupBy(items, key) {
  const map = {}
  for (const item of items) {
    const k = item[key]
    if (!k) continue
    if (!map[k]) map[k] = []
    map[k].push(item)
  }
  return map
}

// Bulk fetch + compute across every client, for the Reports/Dashboard
// compliance rollup. Uses a large limit on the tables that are normally
// capped at 50 for Reports display, since compliance needs the true
// per-client picture, not just the 50 most recent rows system-wide.
export async function getComplianceSummary() {
  const [clients, documents, assessments, goals, servicePlanItems, notes, activities, attendance, referrals, relationships, followUps, incidents] =
    await Promise.all([
      listClientsForCompliance(),
      listAllDocuments(),
      listAllAssessments(),
      listAllClientGoals(5000),
      listAllServicePlanItems(),
      listAllClientNotes(5000),
      listAllCaseActivities(5000),
      listAllAttendanceForCompliance(),
      listReferrals(),
      listAllRelationships(),
      listAllFollowUps(),
      listAllIncidents(),
    ])

  const documentsByClient = groupBy(documents, 'client_id')
  const assessmentsByClient = groupBy(assessments, 'client_id')
  const goalsByClient = groupBy(goals, 'client_id')
  const servicePlanByClient = groupBy(servicePlanItems, 'client_id')
  const notesByClient = groupBy(notes, 'client_id')
  const activitiesByClient = groupBy(activities, 'client_id')
  const attendanceByClient = groupBy(attendance, 'client_id')
  const referralsByClient = groupBy(referrals, 'client_id')
  const relationshipsByClient = groupBy(relationships, 'client_id')
  const followUpsByClient = groupBy(followUps, 'client_id')
  const incidentsByClient = groupBy(incidents, 'client_id')

  const perClient = clients.map((client) => ({
    client,
    compliance: computeClientCompliance({
      client,
      documents: documentsByClient[client.id] ?? [],
      assessments: assessmentsByClient[client.id] ?? [],
      goals: goalsByClient[client.id] ?? [],
      servicePlanItems: servicePlanByClient[client.id] ?? [],
      notes: notesByClient[client.id] ?? [],
      activities: activitiesByClient[client.id] ?? [],
      attendance: attendanceByClient[client.id] ?? [],
      referrals: referralsByClient[client.id] ?? [],
      relationships: relationshipsByClient[client.id] ?? [],
      followUps: followUpsByClient[client.id] ?? [],
      incidents: incidentsByClient[client.id] ?? [],
    }),
  }))

  const activePerClient = perClient.filter((p) => p.client.status === 'active' && !p.client.archived_at)
  const closedPerClient = perClient.filter((p) => p.client.status !== 'active' || p.client.archived_at)

  const totals = {
    missingIntake: activePerClient.filter((p) => !p.compliance.checksByKey.intake_assessment.pass).length,
    missingConsent: activePerClient.filter((p) => !p.compliance.checksByKey[docKey('Consent Form')].pass).length,
    reviewsOverdue: activePerClient.filter((p) => p.compliance.reviewStatus === 'overdue').length,
    noServiceIn30Days: activePerClient.filter((p) => p.compliance.inactiveClient).length,
    missingExitAssessment: closedPerClient.filter((p) => !p.compliance.exitChecks.find((c) => c.key === 'exit_assessment').pass).length,
    incidentsIncomplete: perClient.filter(
      (p) => p.compliance.checksByKey.incident_reviewed && !(p.compliance.checksByKey.incident_reviewed.pass && p.compliance.checksByKey.incident_follow_up.pass && p.compliance.checksByKey.incident_outcome.pass),
    ).length,
    criticalAlerts: activePerClient.reduce((sum, p) => sum + p.compliance.alerts.filter((a) => a.tone === 'red').length, 0),
  }

  return { perClient: [...activePerClient, ...closedPerClient], totals }
}

// Creates a client_follow_up task for every currently-failing check (skips
// anything that already has a matching pending follow-up, so re-running
// this doesn't create duplicates every time).
export async function generateComplianceTasks({ client, compliance, existingFollowUps = [], createdBy }) {
  const existingTitles = new Set(existingFollowUps.filter((f) => f.status === 'Pending').map((f) => f.title))
  const tasksToCreate = []

  for (const section of compliance.sections) {
    if (section.key === 'reviews') continue
    for (const check of section.checks) {
      if (check.applicable === false || check.pass) continue
      const title = `Compliance: ${check.label}`
      if (existingTitles.has(title)) continue
      tasksToCreate.push({
        client_id: client.id,
        title,
        due_date: section.severity === 'critical' ? todayISO() : addDaysISO(7),
        assigned_to: client.assigned_worker_id || null,
        notes: `Auto-generated from compliance check (${section.title}).`,
        created_by: createdBy,
      })
    }
  }

  if (compliance.reviewStatus === 'overdue' || compliance.reviewStatus === 'due-soon') {
    const title = 'Compliance: Complete 90-Day Review'
    if (!existingTitles.has(title)) {
      tasksToCreate.push({
        client_id: client.id,
        title,
        due_date: compliance.reviewStatus === 'overdue' ? todayISO() : client.next_review_date,
        assigned_to: client.assigned_worker_id || null,
        notes: 'Auto-generated from compliance check (Reviews).',
        created_by: createdBy,
      })
    }
  }

  for (const task of tasksToCreate) {
    await createFollowUp(task)
  }
  return tasksToCreate.length
}

// Lighter-weight check used before archiving a client (Section 9: "CRM
// prevents file closure until complete"). Implemented as a soft gate - the
// caller shows what's missing and asks for confirmation, rather than an
// unoverridable block, so staff aren't ever locked out of a legitimate
// closure by a data gap.
export async function getExitReadiness(client) {
  const [assessments, notes, referrals] = await Promise.all([
    listClientAssessments(client.id),
    listClientNotes(client.id),
    listReferralsForClient(client.id),
  ])
  const { exitChecks, exitReady } = computeClientCompliance({ client, assessments, notes, referrals })
  return { exitChecks, exitReady }
}
