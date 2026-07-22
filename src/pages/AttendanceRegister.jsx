import { useEffect, useState } from 'react'
import { Plus, ClipboardCheck, StickyNote, PackageCheck, Users2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import GroupSessionForm from '../components/attendance/GroupSessionForm.jsx'
import GroupSessionsList from '../components/attendance/GroupSessionsList.jsx'
import { listClients, listAssignableWorkers } from '../services/clientService.js'
import { usePrograms } from '../hooks/usePrograms.js'
import { createProgram } from '../services/programService.js'
import { useAttendanceRecords } from '../hooks/useAttendanceRecords.js'
import { useGroupSessions } from '../hooks/useGroupSessions.js'
import { getOrCreateSession, createAttendanceRecord } from '../services/attendanceService.js'
import { createClientNote } from '../services/clientNoteService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const ATTENDANCE_STATUS_TONE = {
  Present: 'success',
  Absent: 'danger',
  Late: 'warning',
  'Left Early': 'warning',
  Excused: 'neutral',
}

const REGISTER_TABS = [
  { key: 'register', label: 'Register', icon: ClipboardCheck },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'service-delivery', label: 'Service Delivery', icon: PackageCheck },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyAttendanceForm = {
  clientId: '',
  programId: '',
  date: todayISO(),
  status: 'Present',
  transportProvided: false,
  notes: '',
}

const emptyProgramForm = { name: '', location: '' }

const emptyNoteForm = { clientId: '', note: '', confidential: false }

export default function AttendanceRegister() {
  const { user } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('register')
  const [clients, setClients] = useState([])
  const [workers, setWorkers] = useState([])
  const { programs, loading: programsLoading, refetch: refetchPrograms } = usePrograms()
  const { records, loading: recordsLoading, error: recordsError, refetch: refetchRecords } = useAttendanceRecords()
  const { sessions: groupSessions, loading: groupSessionsLoading, error: groupSessionsError, refetch: refetchGroupSessions } = useGroupSessions()

  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showGroupSessionForm, setShowGroupSessionForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendanceForm)
  const [programForm, setProgramForm] = useState(emptyProgramForm)
  const [noteForm, setNoteForm] = useState(emptyNoteForm)
  const [savedNotes, setSavedNotes] = useState([])
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [submittingNote, setSubmittingNote] = useState(false)

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleGroupSessionSaved = () => {
    setShowGroupSessionForm(false)
    refetchGroupSessions()
    refetchRecords()
  }

  const handleAddProgram = async (e) => {
    e.preventDefault()
    if (!programForm.name.trim()) return
    try {
      const created = await createProgram({ name: programForm.name.trim(), location: programForm.location || null })
      toast.success('Program added.')
      setProgramForm(emptyProgramForm)
      setShowProgramForm(false)
      await refetchPrograms()
      setAttendanceForm((f) => ({ ...f, programId: created.id }))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleAddAttendance = async (e) => {
    e.preventDefault()
    if (!attendanceForm.clientId || !attendanceForm.programId) return
    setSubmittingAttendance(true)
    try {
      const session = await getOrCreateSession({
        programId: attendanceForm.programId,
        sessionDate: attendanceForm.date,
        createdBy: user?.id,
      })
      await createAttendanceRecord({
        session_id: session.id,
        client_id: attendanceForm.clientId,
        attendance_status: attendanceForm.status,
        transport_provided: attendanceForm.transportProvided,
        notes: attendanceForm.notes || null,
        recorded_by: user?.id,
      })
      toast.success('Attendance recorded.')
      setAttendanceForm((f) => ({ ...emptyAttendanceForm, programId: f.programId }))
      setShowAttendanceForm(false)
      refetchRecords()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingAttendance(false)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!noteForm.clientId || !noteForm.note.trim()) return
    setSubmittingNote(true)
    try {
      const note = await createClientNote({
        client_id: noteForm.clientId,
        note_type: 'Attendance',
        content: noteForm.note.trim(),
        confidential: noteForm.confidential,
        created_by: user?.id,
      })
      const client = clients.find((c) => c.id === noteForm.clientId)
      toast.success("Note saved to the client's profile.")
      setSavedNotes((prev) => [{ ...note, clientName: client ? `${client.first_name} ${client.last_name}` : '' }, ...prev])
      setNoteForm(emptyNoteForm)
      setShowNoteForm(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingNote(false)
    }
  }

  return (
    <>
      <div className="fade-up">
        <div className="tabs">
          {REGISTER_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`tab-item${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'register' && (
        <div className="fade-up" style={{ marginTop: 20 }}>
          <div className="section-head">
            <div>
              <div className="section-title">Group Sessions</div>
              <div className="section-subtitle">
                Log a session once — attendance and case notes are created for every participant automatically
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setShowProgramForm((v) => !v)}>
                <Plus strokeWidth={2} />
                New Program
              </Button>
              <Button onClick={() => setShowGroupSessionForm((v) => !v)}>
                <Users2 strokeWidth={2} />
                New Group Session
              </Button>
            </div>
          </div>

          {showProgramForm && (
            <Card style={{ marginBottom: 18 }}>
              <form onSubmit={handleAddProgram}>
                <div className="form-grid">
                  <div>
                    <label className="form-label" htmlFor="prog-name">
                      Program Name
                    </label>
                    <input
                      id="prog-name"
                      className="input"
                      value={programForm.name}
                      onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="prog-location">
                      Location
                    </label>
                    <input
                      id="prog-location"
                      className="input"
                      value={programForm.location}
                      onChange={(e) => setProgramForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setShowProgramForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Program</Button>
                </div>
              </form>
            </Card>
          )}

          {showGroupSessionForm && (
            <GroupSessionForm
              programs={programs}
              workers={workers}
              clients={clients}
              onCancel={() => setShowGroupSessionForm(false)}
              onSaved={handleGroupSessionSaved}
            />
          )}

          <div style={{ marginBottom: 24 }}>
            <GroupSessionsList sessions={groupSessions} loading={groupSessionsLoading} error={groupSessionsError} />
          </div>

          <div className="section-head">
            <div>
              <div className="section-title">Individual Attendance Records</div>
              <div className="section-subtitle">{recordsLoading ? 'Loading...' : `${records.length} total records`}</div>
            </div>
            <Button onClick={() => setShowAttendanceForm((v) => !v)}>
              <Plus strokeWidth={2} />
              Add Attendance
            </Button>
          </div>

          {showAttendanceForm && (
            <Card style={{ marginBottom: 18 }}>
              {programs.length === 0 && !programsLoading ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No programs yet"
                  text="Click 'New Program' above to create one before logging attendance."
                />
              ) : (
                <form onSubmit={handleAddAttendance}>
                  <div className="form-grid">
                    <div>
                      <label className="form-label" htmlFor="att-client">
                        Client
                      </label>
                      <select
                        id="att-client"
                        className="input"
                        value={attendanceForm.clientId}
                        onChange={(e) => setAttendanceForm((f) => ({ ...f, clientId: e.target.value }))}
                        required
                      >
                        <option value="">Select a client...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="att-program">
                        Program
                      </label>
                      <select
                        id="att-program"
                        className="input"
                        value={attendanceForm.programId}
                        onChange={(e) => setAttendanceForm((f) => ({ ...f, programId: e.target.value }))}
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
                      <label className="form-label" htmlFor="att-date">
                        Session Date
                      </label>
                      <input
                        id="att-date"
                        type="date"
                        className="input"
                        value={attendanceForm.date}
                        onChange={(e) => setAttendanceForm((f) => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="att-status">
                        Status
                      </label>
                      <select
                        id="att-status"
                        className="input"
                        value={attendanceForm.status}
                        onChange={(e) => setAttendanceForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option>Present</option>
                        <option>Absent</option>
                        <option>Late</option>
                        <option>Left Early</option>
                        <option>Excused</option>
                      </select>
                    </div>
                  </div>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={attendanceForm.transportProvided}
                      onChange={(e) => setAttendanceForm((f) => ({ ...f, transportProvided: e.target.checked }))}
                    />
                    <span>Transport provided</span>
                  </label>
                  <div style={{ marginTop: 14 }}>
                    <label className="form-label" htmlFor="att-notes">
                      Notes
                    </label>
                    <textarea
                      id="att-notes"
                      className="input"
                      rows={2}
                      placeholder="Optional notes about this attendance..."
                      value={attendanceForm.notes}
                      onChange={(e) => setAttendanceForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => setShowAttendanceForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submittingAttendance}>
                      {submittingAttendance ? 'Saving...' : 'Save Record'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          <Card style={{ padding: 0 }}>
            {recordsLoading ? (
              <EmptyState icon={ClipboardCheck} title="Loading attendance..." text="Fetching attendance records." />
            ) : recordsError ? (
              <EmptyState icon={ClipboardCheck} title="Couldn't load attendance" text={recordsError} />
            ) : records.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No attendance records yet"
                text="Add a client above to start tracking program attendance."
              />
            ) : (
              <div className="data-table">
                <div className="data-row attendance-row data-row--head">
                  <span>Client</span>
                  <span>Program</span>
                  <span>Session Date</span>
                  <span>Transport</span>
                  <span>Status</span>
                </div>
                {records.map((r) => {
                  const clientName = r.client ? [r.client.first_name, r.client.last_name].filter(Boolean).join(' ') : '—'
                  return (
                    <div className="data-row attendance-row" key={r.id}>
                      <div className="client-identity">
                        <div className={`client-avatar avatar--${avatarTone(clientName)}`}>{initials(clientName)}</div>
                        <span>{clientName}</span>
                      </div>
                      <span className="data-cell-muted">{r.session?.program?.name ?? '—'}</span>
                      <span className="data-cell-muted">{r.session?.session_date ?? '—'}</span>
                      <span className="data-cell-muted">{r.transport_provided ? 'Yes' : 'No'}</span>
                      <StatusPill tone={ATTENDANCE_STATUS_TONE[r.attendance_status] ?? 'neutral'}>
                        {r.attendance_status}
                      </StatusPill>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="fade-up" style={{ marginTop: 20 }}>
          <div className="section-head">
            <div>
              <div className="section-title">Register Notes</div>
              <div className="section-subtitle">
                Saved directly to the client's profile — visible on their Case Notes tab
              </div>
            </div>
            <Button onClick={() => setShowNoteForm((v) => !v)}>
              <Plus strokeWidth={2} />
              Add Note
            </Button>
          </div>

          {showNoteForm && (
            <Card style={{ marginBottom: 18 }}>
              <form onSubmit={handleAddNote}>
                <div className="form-grid">
                  <div>
                    <label className="form-label" htmlFor="note-client">
                      Client
                    </label>
                    <select
                      id="note-client"
                      className="input"
                      value={noteForm.clientId}
                      onChange={(e) => setNoteForm((f) => ({ ...f, clientId: e.target.value }))}
                      required
                    >
                      <option value="">Select a client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="form-label" htmlFor="note-text">
                    Note
                  </label>
                  <textarea
                    id="note-text"
                    className="input"
                    rows={3}
                    placeholder="Write a note about this attendance or interaction..."
                    value={noteForm.note}
                    onChange={(e) => setNoteForm((f) => ({ ...f, note: e.target.value }))}
                    required
                  />
                </div>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={noteForm.confidential}
                    onChange={(e) => setNoteForm((f) => ({ ...f, confidential: e.target.checked }))}
                  />
                  <span>Mark as confidential (only visible to you and administrators/managers)</span>
                </label>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setShowNoteForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingNote}>
                    {submittingNote ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card style={{ padding: 0 }}>
            {savedNotes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title="No notes saved this session"
                text="Notes you add here are written straight to the client's Case Notes tab."
              />
            ) : (
              <div className="data-table">
                <div className="data-row notes-row data-row--head">
                  <span>Client</span>
                  <span>Note</span>
                  <span>Date</span>
                  <span>Confidential</span>
                </div>
                {savedNotes.map((n) => (
                  <div className="data-row notes-row" key={n.id}>
                    <div className="client-identity">
                      <div className={`client-avatar avatar--${avatarTone(n.clientName || '—')}`}>{initials(n.clientName || '—')}</div>
                      <span>{n.clientName}</span>
                    </div>
                    <span className="data-cell-muted">{n.content}</span>
                    <span className="data-cell-muted">{n.note_date}</span>
                    {n.confidential ? (
                      <StatusPill tone="danger">Confidential</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">No</StatusPill>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'service-delivery' && (
        <div className="fade-up" style={{ marginTop: 20 }}>
          <Card>
            <EmptyState
              icon={PackageCheck}
              title="No services delivered yet"
              text="Services delivered during attendance will be recorded here."
            />
          </Card>
        </div>
      )}
    </>
  )
}
