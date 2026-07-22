import { useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientNotes } from '../../hooks/useClientNotes.js'
import { createClientNote } from '../../services/clientNoteService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const NOTE_TYPES = ['General', 'Case Review', 'Progress Update', 'Incident', 'Other']

export default function CaseNotesPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { notes, loading, error, refetch } = useClientNotes(clientId)
  const [showForm, setShowForm] = useState(false)
  const [noteType, setNoteType] = useState(NOTE_TYPES[0])
  const [content, setContent] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await createClientNote({
        client_id: clientId,
        note_type: noteType,
        content: content.trim(),
        confidential,
        created_by: user?.id,
      })
      toast.success('Note added.')
      setContent('')
      setConfidential(false)
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
          <div className="section-title">Case Notes</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} for ${clientName}`}
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
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="note-type">
                  Note Type
                </label>
                <select id="note-type" className="input" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {NOTE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="case-note-text">
                Note
              </label>
              <textarea
                id="case-note-text"
                className="input"
                rows={3}
                placeholder="Write a case note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <label className="checkbox-field">
              <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
              <span>Mark as confidential (only visible to you and administrators/managers)</span>
            </label>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && notes.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={FileText} title="Loading notes..." text="Fetching case notes for this client." />
        ) : error ? (
          <EmptyState icon={FileText} title="Couldn't load notes" text={error} />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No case notes yet"
            text="Notes logged by staff for this client will appear here."
          />
        ) : (
          <div className="note-list">
            {notes.map((n) => {
              const authorName = n.author
                ? [n.author.first_name, n.author.last_name].filter(Boolean).join(' ') || 'Unknown'
                : 'Unknown'
              return (
                <div className="note-item" key={n.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>
                        {authorName}
                        {n.note_type && ` · ${n.note_type}`}
                      </span>
                      {n.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
                    </div>
                    <span>{n.note_date}</span>
                  </div>
                  <div className="note-item-text">{n.content}</div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
