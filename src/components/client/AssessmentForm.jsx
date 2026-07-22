import { useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import {
  ASSESSMENT_TYPES,
  PRESENTING_ISSUES,
  RISK_LEVELS,
  RISK_DOMAINS,
  NEEDS_LEVELS,
  NEEDS_DOMAINS,
  PROTECTIVE_FACTORS,
  SEWB_DOMAINS,
  ENGAGEMENT_LEVELS,
  ATTENDANCE_LEVELS,
  PROGRESS_STATUSES,
} from '../../data/assessmentOptions.js'

const todayISO = () => new Date().toISOString().slice(0, 10)

function buildEmptyForm(currentUserId) {
  return {
    assessment_type: 'Intake',
    assessment_date: todayISO(),
    assessor_id: currentUserId || '',
    referral_date: '',
    intake_date: '',
    consent_obtained: false,
    eligibility_confirmed: false,
    primary_program: '',
    funding_source: '',
    preferred_language: '',
    school_or_education_provider: '',
    presenting_issues: [],
    presenting_issues_other: '',
    risk_ratings: {},
    overall_risk_level: '',
    needs_ratings: {},
    protective_factors: [],
    sewb_scores: {},
    engagement_rating: '',
    attendance_rating: '',
    progress_status: '',
    review_notes: '',
    exit_reason: '',
    goals_achieved: '',
    education_outcome: '',
    employment_outcome: '',
    housing_outcome: '',
    cultural_outcome: '',
    wellbeing_outcome: '',
    referral_to_ongoing_supports: '',
    staff_summary: '',
    confidential: false,
  }
}

function ChipToggleGroup({ options, selected, onToggle }) {
  return (
    <div className="chip-toggle-grid">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`chip-toggle${selected.includes(o) ? ' active' : ''}`}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function RatingGrid({ domains, levels, value, onChange }) {
  return (
    <div className="rating-grid">
      {domains.map((d) => (
        <div className="rating-row" key={d.key}>
          <span className="rating-row-label">{d.label}</span>
          <div className="rating-btn-group">
            {levels.map((level) => (
              <button
                key={level}
                type="button"
                className={`rating-btn${value[d.key] === level ? ' active' : ''}`}
                onClick={() => onChange(d.key, level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SewbGrid({ value, onChange }) {
  return (
    <div className="rating-grid">
      {SEWB_DOMAINS.map((d) => (
        <div className="rating-row" key={d.key}>
          <span className="rating-row-label">{d.label}</span>
          <div className="rating-btn-group">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                className={`rating-btn${value[d.key] === score ? ' active' : ''}`}
                onClick={() => onChange(d.key, score)}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AssessmentForm({ clientId, workers, currentUserId, onSave, onCancel, submitting }) {
  const [form, setForm] = useState(() => buildEmptyForm(currentUserId))
  const [formError, setFormError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setChecked = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }))
  const toggleArrayValue = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }))
  const setRating = (field) => (key, level) => setForm((f) => ({ ...f, [field]: { ...f[field], [key]: level } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    try {
      const payload = { ...form, client_id: clientId }
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null
      }
      await onSave(payload)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const isIntake = form.assessment_type === 'Intake'
  const isReview = form.assessment_type === 'Review'
  const isExit = form.assessment_type === 'Exit'

  return (
    <Card style={{ marginBottom: 18 }}>
      <form onSubmit={handleSubmit}>
        <div className="assessment-section-title">Assessment Details</div>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="as-type">
              Assessment Type
            </label>
            <select id="as-type" className="input" value={form.assessment_type} onChange={set('assessment_type')}>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="as-date">
              Assessment Date
            </label>
            <input id="as-date" type="date" className="input" value={form.assessment_date} onChange={set('assessment_date')} required />
          </div>
          <div>
            <label className="form-label" htmlFor="as-assessor">
              Assessor
            </label>
            <select id="as-assessor" className="input" value={form.assessor_id} onChange={set('assessor_id')}>
              <option value="">Select...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={form.confidential} onChange={setChecked('confidential')} />
          Mark this assessment confidential (visible only to you and administrators/managers)
        </label>

        {isIntake && (
          <>
            <div className="assessment-section-title">Section 1 · Intake &amp; Eligibility</div>
            <div className="assessment-section-hint">
              Referral source, cultural background, demographics, and guardian/emergency contacts are captured on
              the client's Details and Family &amp; Contacts tabs and don't need to be repeated here.
            </div>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="as-referral-date">
                  Referral Date
                </label>
                <input id="as-referral-date" type="date" className="input" value={form.referral_date} onChange={set('referral_date')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-intake-date">
                  Intake Date
                </label>
                <input id="as-intake-date" type="date" className="input" value={form.intake_date} onChange={set('intake_date')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-program">
                  Primary Program
                </label>
                <input id="as-program" className="input" value={form.primary_program} onChange={set('primary_program')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-funding">
                  Funding Source
                </label>
                <input id="as-funding" className="input" value={form.funding_source} onChange={set('funding_source')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-language">
                  Preferred Language
                </label>
                <input id="as-language" className="input" value={form.preferred_language} onChange={set('preferred_language')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-school">
                  School / Education Provider
                </label>
                <input id="as-school" className="input" value={form.school_or_education_provider} onChange={set('school_or_education_provider')} />
              </div>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.consent_obtained} onChange={setChecked('consent_obtained')} />
              Consent obtained
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.eligibility_confirmed} onChange={setChecked('eligibility_confirmed')} />
              Eligibility confirmed
            </label>

            <div className="assessment-section-title">Section 2 · Presenting Issues</div>
            <div className="assessment-section-hint">Tick all that apply.</div>
            <ChipToggleGroup
              options={PRESENTING_ISSUES}
              selected={form.presenting_issues}
              onToggle={(v) => toggleArrayValue('presenting_issues', v)}
            />
            {form.presenting_issues.includes('Other') && (
              <div style={{ marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="Describe other presenting issue..."
                  value={form.presenting_issues_other}
                  onChange={set('presenting_issues_other')}
                />
              </div>
            )}
          </>
        )}

        {(isIntake || isReview) && (
          <>
            <div className="assessment-section-title">Section 3 · Risk Assessment</div>
            <RatingGrid domains={RISK_DOMAINS} levels={RISK_LEVELS} value={form.risk_ratings} onChange={setRating('risk_ratings')} />
            <div style={{ marginTop: 14, maxWidth: 220 }}>
              <label className="form-label" htmlFor="as-overall-risk">
                Overall Risk Level
              </label>
              <select id="as-overall-risk" className="input" value={form.overall_risk_level} onChange={set('overall_risk_level')}>
                <option value="">Select...</option>
                {RISK_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="assessment-section-title">Section 4 · Needs Assessment</div>
            <RatingGrid domains={NEEDS_DOMAINS} levels={NEEDS_LEVELS} value={form.needs_ratings} onChange={setRating('needs_ratings')} />

            <div className="assessment-section-title">Section 5 · Protective Factors</div>
            <div className="assessment-section-hint">Tick all that apply.</div>
            <ChipToggleGroup
              options={PROTECTIVE_FACTORS}
              selected={form.protective_factors}
              onToggle={(v) => toggleArrayValue('protective_factors', v)}
            />
          </>
        )}

        <div className="assessment-section-title">Section 7 · Bori Muy SEWB Assessment{isExit ? ' (Exit Scores)' : ''}</div>
        <div className="assessment-section-hint">Rate each domain 1 (low) – 5 (high).</div>
        <SewbGrid value={form.sewb_scores} onChange={setRating('sewb_scores')} />

        {isReview && (
          <>
            <div className="assessment-section-title">Section 9 · Review Assessment</div>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="as-engagement">
                  Engagement
                </label>
                <select id="as-engagement" className="input" value={form.engagement_rating} onChange={set('engagement_rating')}>
                  <option value="">Select...</option>
                  {ENGAGEMENT_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="as-attendance">
                  Attendance
                </label>
                <select id="as-attendance" className="input" value={form.attendance_rating} onChange={set('attendance_rating')}>
                  <option value="">Select...</option>
                  {ATTENDANCE_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="as-progress">
                  Overall Progress
                </label>
                <select id="as-progress" className="input" value={form.progress_status} onChange={set('progress_status')}>
                  <option value="">Select...</option>
                  {PROGRESS_STATUSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="as-review-notes">
                Review Notes
              </label>
              <textarea id="as-review-notes" className="input" rows={3} value={form.review_notes} onChange={set('review_notes')} />
            </div>
          </>
        )}

        {isExit && (
          <>
            <div className="assessment-section-title">Section 10 · Exit Assessment</div>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="as-exit-reason">
                  Reason for Exit
                </label>
                <input id="as-exit-reason" className="input" value={form.exit_reason} onChange={set('exit_reason')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-education-outcome">
                  Education Outcome
                </label>
                <input id="as-education-outcome" className="input" value={form.education_outcome} onChange={set('education_outcome')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-employment-outcome">
                  Employment Outcome
                </label>
                <input id="as-employment-outcome" className="input" value={form.employment_outcome} onChange={set('employment_outcome')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-housing-outcome">
                  Housing Outcome
                </label>
                <input id="as-housing-outcome" className="input" value={form.housing_outcome} onChange={set('housing_outcome')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-cultural-outcome">
                  Cultural Outcome
                </label>
                <input id="as-cultural-outcome" className="input" value={form.cultural_outcome} onChange={set('cultural_outcome')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-wellbeing-outcome">
                  Wellbeing Outcome
                </label>
                <input id="as-wellbeing-outcome" className="input" value={form.wellbeing_outcome} onChange={set('wellbeing_outcome')} />
              </div>
              <div>
                <label className="form-label" htmlFor="as-referral-ongoing">
                  Referral to Ongoing Supports
                </label>
                <input id="as-referral-ongoing" className="input" value={form.referral_to_ongoing_supports} onChange={set('referral_to_ongoing_supports')} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="as-goals-achieved">
                Goals Achieved
              </label>
              <textarea id="as-goals-achieved" className="input" rows={2} value={form.goals_achieved} onChange={set('goals_achieved')} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="as-staff-summary">
                Staff Summary
              </label>
              <textarea id="as-staff-summary" className="input" rows={3} value={form.staff_summary} onChange={set('staff_summary')} />
            </div>
          </>
        )}

        {formError && <div className="login-error" style={{ marginTop: 16 }}>{formError}</div>}

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
