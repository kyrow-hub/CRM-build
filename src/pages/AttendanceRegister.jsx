import { useState } from 'react'
import { Plus, ClipboardCheck, StickyNote, PackageCheck } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { mockClients } from '../data/mockClients.js'
import { PROGRAMS } from '../data/mockPrograms.js'

const ATTENDANCE_STATUS_TONE = {
  Present: 'success',
  Absent: 'danger',
  Excused: 'warning',
}

const REGISTER_TABS = [
  { key: 'register', label: 'Register', icon: ClipboardCheck },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'service-delivery', label: 'Service Delivery', icon: PackageCheck },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyAttendanceForm = {
  clientId: '',
  program: PROGRAMS[0].id,
  activity: PROGRAMS[0].activities[0],
  date: todayISO(),
  status: 'Present',
}

const emptyNoteForm = { clientId: '', note: '', shared: false }

export default function AttendanceRegister() {
  const [activeTab, setActiveTab] = useState('register')
  const [records, setRecords] = useState([])
  const [notes, setNotes] = useState([])
  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendanceForm)
  const [noteForm, setNoteForm] = useState(emptyNoteForm)

  const selectedProgram = PROGRAMS.find((p) => p.id === attendanceForm.program) ?? PROGRAMS[0]

  const handleProgramChange = (programId) => {
    const program = PROGRAMS.find((p) => p.id === programId)
    setAttendanceForm((f) => ({ ...f, program: programId, activity: program.activities[0] }))
  }

  const handleAddAttendance = (e) => {
    e.preventDefault()
    if (!attendanceForm.clientId) return
    const client = mockClients.find((c) => String(c.id) === attendanceForm.clientId)
    setRecords((prev) => [
      {
        id: Date.now(),
        client,
        program: selectedProgram.name,
        activity: attendanceForm.activity,
        date: attendanceForm.date,
        status: attendanceForm.status,
      },
      ...prev,
    ])
    setAttendanceForm(emptyAttendanceForm)
    setShowAttendanceForm(false)
  }

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!noteForm.clientId || !noteForm.note.trim()) return
    const client = mockClients.find((c) => String(c.id) === noteForm.clientId)
    setNotes((prev) => [
      { id: Date.now(), client, note: noteForm.note.trim(), shared: noteForm.shared, date: todayISO() },
      ...prev,
    ])
    setNoteForm(emptyNoteForm)
    setShowNoteForm(false)
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
              <div className="section-title">Attendance Records</div>
              <div className="section-subtitle">{records.length} recorded this session</div>
            </div>
            <Button onClick={() => setShowAttendanceForm((v) => !v)}>
              <Plus strokeWidth={2} />
              Add Attendance
            </Button>
          </div>

          {showAttendanceForm && (
            <Card style={{ marginBottom: 18 }}>
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
                      {mockClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
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
                      value={attendanceForm.program}
                      onChange={(e) => handleProgramChange(e.target.value)}
                    >
                      {PROGRAMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="att-activity">
                      Activity
                    </label>
                    <select
                      id="att-activity"
                      className="input"
                      value={attendanceForm.activity}
                      onChange={(e) => setAttendanceForm((f) => ({ ...f, activity: e.target.value }))}
                    >
                      {selectedProgram.activities.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="att-date">
                      Date
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
                      <option>Excused</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setShowAttendanceForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Record</Button>
                </div>
              </form>
            </Card>
          )}

          <Card style={{ padding: 0 }}>
            {records.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No attendance records yet"
                text="Add a client above to start tracking program and activity attendance."
              />
            ) : (
              <div className="data-table">
                <div className="data-row attendance-row data-row--head">
                  <span>Client</span>
                  <span>Program</span>
                  <span>Activity</span>
                  <span>Date</span>
                  <span>Status</span>
                </div>
                {records.map((r) => (
                  <div className="data-row attendance-row" key={r.id}>
                    <div className="client-identity">
                      <div className="client-avatar">{r.client?.initials}</div>
                      <span>{r.client?.name}</span>
                    </div>
                    <span className="data-cell-muted">{r.program}</span>
                    <span className="data-cell-muted">{r.activity}</span>
                    <span className="data-cell-muted">{r.date}</span>
                    <StatusPill tone={ATTENDANCE_STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</StatusPill>
                  </div>
                ))}
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
                {notes.length} {notes.length === 1 ? 'note' : 'notes'} logged this session
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
                      {mockClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
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
                    checked={noteForm.shared}
                    onChange={(e) => setNoteForm((f) => ({ ...f, shared: e.target.checked }))}
                  />
                  <span>Share to client's profile (Case Notes)</span>
                </label>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setShowNoteForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Note</Button>
                </div>
              </form>
            </Card>
          )}

          <Card style={{ padding: 0 }}>
            {notes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title="No notes yet"
                text="Notes logged here can optionally be shared back to a client's Case Notes tab."
              />
            ) : (
              <div className="data-table">
                <div className="data-row notes-row data-row--head">
                  <span>Client</span>
                  <span>Note</span>
                  <span>Date</span>
                  <span>Shared</span>
                </div>
                {notes.map((n) => (
                  <div className="data-row notes-row" key={n.id}>
                    <div className="client-identity">
                      <div className="client-avatar">{n.client?.initials}</div>
                      <span>{n.client?.name}</span>
                    </div>
                    <span className="data-cell-muted">{n.note}</span>
                    <span className="data-cell-muted">{n.date}</span>
                    {n.shared ? (
                      <StatusPill tone="success">Shared</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Not shared</StatusPill>
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
