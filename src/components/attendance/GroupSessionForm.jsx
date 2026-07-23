import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import { createGroupSession, recordGroupAttendance, fanOutGroupNote, addIndividualSessionNote } from '../../services/groupSessionService.js'
import { addProgramParticipant, removeProgramParticipant } from '../../services/programParticipantService.js'
import { useProgramParticipants } from '../../hooks/useProgramParticipants.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Left Early', 'Excused']

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptySessionForm = {
  programId: '',
  sessionDate: todayISO(),
  startTime: '',
  endTime: '',
  location: '',
  activityType: '',
  facilitatorId: '',
  overnightCamp: false,
}

export default function GroupSessionForm({ programs, workers, clients, onCancel, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [sessionForm, setSessionForm] = useState(emptySessionForm)
  const [participants, setParticipants] = useState([])
  const [newParticipantId, setNewParticipantId] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [removingParticipantId, setRemovingParticipantId] = useState(null)
  const [groupNote, setGroupNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { participants: roster, loading: rosterLoading, refetch: refetchRoster } = useProgramParticipants(sessionForm.programId)

  // The roster (who's a member of this program) is persisted server-side;
  // this just carries each member's per-session status/note across
  // roster refetches, defaulting new members to Present.
  useEffect(() => {
    setParticipants((prev) => {
      const prevByClient = Object.fromEntries(prev.map((p) => [p.clientId, p]))
      return roster.map((r) => ({
        clientId: r.client_id,
        participantId: r.id,
        status: prevByClient[r.client_id]?.status ?? 'Present',
        individualNote: prevByClient[r.client_id]?.individualNote ?? '',
        showNote: prevByClient[r.client_id]?.showNote ?? false,
      }))
    })
  }, [roster])

  const handleProgramChange = (programId) => {
    const program = programs.find((p) => p.id === programId)
    setSessionForm((f) => ({ ...f, programId, location: program?.location ?? f.location }))
  }

  const handleAddParticipant = async () => {
    if (!newParticipantId) return
    setAddingParticipant(true)
    try {
      await addProgramParticipant({ programId: sessionForm.programId, clientId: newParticipantId, createdBy: user?.id })
      setNewParticipantId('')
      refetchRoster()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingParticipant(false)
    }
  }

  const updateParticipant = (clientId, changes) => {
    setParticipants((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, ...changes } : p)))
  }

  const removeParticipant = async (participant) => {
    const client = clients.find((c) => c.id === participant.clientId)
    const name = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : 'this participant'
    if (!window.confirm(`Remove ${name} from this program's roster? They can be re-added later.`)) return
    setRemovingParticipantId(participant.participantId)
    try {
      await removeProgramParticipant(participant.participantId)
      refetchRoster()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemovingParticipantId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sessionForm.programId) {
      toast.error('Select a program for this session.')
      return
    }
    if (participants.length === 0) {
      toast.error('Add at least one participant.')
      return
    }
    if (!groupNote.trim()) {
      toast.error('Write a group note describing what happened in the session.')
      return
    }

    setSubmitting(true)
    try {
      const session = await createGroupSession({
        program_id: sessionForm.programId,
        session_date: sessionForm.sessionDate,
        start_time: sessionForm.startTime || null,
        end_time: sessionForm.endTime || null,
        location: sessionForm.location || null,
        activity_type: sessionForm.activityType || null,
        facilitator_id: sessionForm.facilitatorId || null,
        overnight_camp: sessionForm.overnightCamp,
        group_note: groupNote.trim(),
        created_by: user?.id,
      })

      const attendanceRows = await recordGroupAttendance(
        session.id,
        participants.map((p) => ({ clientId: p.clientId, status: p.status })),
        user?.id,
      )

      await fanOutGroupNote({ session, groupNote, attendanceRows, createdBy: user?.id })

      for (const p of participants) {
        if (p.individualNote.trim()) {
          await addIndividualSessionNote({
            clientId: p.clientId,
            sessionId: session.id,
            content: p.individualNote,
            createdBy: user?.id,
          })
        }
      }

      toast.success(`Group session saved. Case notes created for ${participants.length} participant(s).`)
      setSessionForm(emptySessionForm)
      setParticipants([])
      setGroupNote('')
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const availableClients = clients.filter((c) => !participants.some((p) => p.clientId === c.id))

  return (
    <Card style={{ marginBottom: 18 }}>
      <form onSubmit={handleSubmit}>
        <div className="form-section-title">Session Details</div>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="gs-program">
              Program
            </label>
            <select
              id="gs-program"
              className="input"
              value={sessionForm.programId}
              onChange={(e) => handleProgramChange(e.target.value)}
              required
            >
              <option value="">Select a program...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="gs-date">
              Date
            </label>
            <input
              id="gs-date"
              type="date"
              className="input"
              value={sessionForm.sessionDate}
              onChange={(e) => setSessionForm((f) => ({ ...f, sessionDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="gs-start">
              Start Time
            </label>
            <input
              id="gs-start"
              type="time"
              className="input"
              value={sessionForm.startTime}
              onChange={(e) => setSessionForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="gs-end">
              End Time
            </label>
            <input
              id="gs-end"
              type="time"
              className="input"
              value={sessionForm.endTime}
              onChange={(e) => setSessionForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="gs-location">
              Location
            </label>
            <input
              id="gs-location"
              className="input"
              value={sessionForm.location}
              onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="gs-activity">
              Activity Type
            </label>
            <input
              id="gs-activity"
              className="input"
              placeholder="e.g. Group Fitness, Outreach, Camp"
              value={sessionForm.activityType}
              onChange={(e) => setSessionForm((f) => ({ ...f, activityType: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="gs-facilitator">
              Staff Facilitating
            </label>
            <select
              id="gs-facilitator"
              className="input"
              value={sessionForm.facilitatorId}
              onChange={(e) => setSessionForm((f) => ({ ...f, facilitatorId: e.target.value }))}
            >
              <option value="">Select a staff member...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {[w.first_name, w.last_name].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={sessionForm.overnightCamp}
            onChange={(e) => setSessionForm((f) => ({ ...f, overnightCamp: e.target.checked }))}
          />
          <span>This is an overnight camp</span>
        </label>

        <div className="form-section-title" style={{ marginTop: 22 }}>
          Participants (Program Roster)
        </div>
        <div className="data-cell-muted" style={{ marginBottom: 14 }}>
          {sessionForm.programId
            ? "Once someone's added here they stay on this program's roster for every future session - just set their status below instead of re-adding them each time."
            : 'Select a program above to see and manage its roster.'}
        </div>
        {sessionForm.programId && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <select className="input" value={newParticipantId} onChange={(e) => setNewParticipantId(e.target.value)}>
                <option value="">Select a client to add to the roster...</option>
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="secondary" onClick={handleAddParticipant} disabled={addingParticipant || !newParticipantId}>
              <Plus strokeWidth={2} />
              {addingParticipant ? 'Adding...' : 'Add to Roster'}
            </Button>
          </div>
        )}

        {rosterLoading ? (
          <div className="data-cell-muted" style={{ marginBottom: 14 }}>
            Loading roster...
          </div>
        ) : participants.length === 0 ? (
          <div className="data-cell-muted" style={{ marginBottom: 14 }}>
            {sessionForm.programId ? 'No one on this program\'s roster yet - add participants above.' : 'No participants yet.'}
          </div>
        ) : (
          <div className="group-session-participants">
            {participants.map((p) => {
              const client = clients.find((c) => c.id === p.clientId)
              const name = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : 'Unknown'
              return (
                <div key={p.clientId} className="group-session-participant-row">
                  <div className="group-session-participant-main">
                    <span className="group-session-participant-name">{name}</span>
                    <select
                      className="input"
                      style={{ width: 150 }}
                      value={p.status}
                      onChange={(e) => updateParticipant(p.clientId, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => updateParticipant(p.clientId, { showNote: !p.showNote })}
                    >
                      {p.showNote ? 'Hide note' : 'Add individual note'}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => removeParticipant(p)}
                      disabled={removingParticipantId === p.participantId}
                      aria-label={`Remove ${name} from roster`}
                      title="Remove from program roster"
                    >
                      <X strokeWidth={2} />
                    </button>
                  </div>
                  {p.showNote && (
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Additional note for this participant only..."
                      value={p.individualNote}
                      onChange={(e) => updateParticipant(p.clientId, { individualNote: e.target.value })}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="form-section-title" style={{ marginTop: 22 }}>
          Group Note
        </div>
        <textarea
          className="input"
          rows={4}
          placeholder="Write one note describing the session. It will be copied onto every participant's case note record automatically."
          value={groupNote}
          onChange={(e) => setGroupNote(e.target.value)}
          required
        />

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Group Session'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
