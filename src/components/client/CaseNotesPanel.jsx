import { useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function CaseNotesPanel({ clientName }) {
  const [notes, setNotes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setNotes((prev) => [{ id: Date.now(), text: text.trim(), date: todayISO(), author: 'You' }, ...prev])
    setText('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Case Notes</div>
          <div className="section-subtitle">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} for {clientName}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Note
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <label className="form-label" htmlFor="case-note-text">
              Note
            </label>
            <textarea
              id="case-note-text"
              className="input"
              rows={3}
              placeholder="Write a case note..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Note</Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={notes.length === 0 ? undefined : { padding: 0 }}>
        {notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No case notes yet"
            text="Notes logged by staff for this client will appear here."
          />
        ) : (
          <div className="note-list">
            {notes.map((n) => (
              <div className="note-item" key={n.id}>
                <div className="note-item-meta">
                  <span>{n.author}</span>
                  <span>{n.date}</span>
                </div>
                <div className="note-item-text">{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
