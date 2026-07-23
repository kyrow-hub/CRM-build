import { useState } from 'react'
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientNotes } from '../../hooks/useClientNotes.js'
import { createClientNote, updateClientNote, deleteClientNote } from '../../services/clientNoteService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { NOTE_CATEGORIES } from '../../data/noteCategories.js'

function NoteItem({ note, canEdit, canDelete, onUpdated, onDeleted }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [noteType, setNoteType] = useState(note.note_type || NOTE_CATEGORIES[0])
  const [content, setContent] = useState(note.content)
  const [confidential, setConfidential] = useState(note.confidential)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const authorName = note.author ? [note.author.first_name, note.author.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unknown'

  const handleSave = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await updateClientNote(note.id, { note_type: noteType, content: content.trim(), confidential })
      toast.success('Note updated.')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteClientNote(note.id)
      toast.success('Note deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="note-item">
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor={`note-type-${note.id}`}>
                Category
              </label>
              <select id={`note-type-${note.id}`} className="input" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                {NOTE_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <textarea className="input" rows={3} value={content} onChange={(e) => setContent(e.target.value)} required />
          </div>
          <label className="checkbox-field">
            <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
            <span>Mark as confidential (only visible to you and administrators/managers)</span>
          </label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>
            {authorName}
            {note.note_type && ` · ${note.note_type}`}
          </span>
          {note.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
        </div>
        <span>{note.note_date}</span>
      </div>
      <div className="note-item-text">{note.content}</div>
      {(canEdit || canDelete) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {canEdit && (
            <button type="button" className="link-button" onClick={() => setEditing(true)}>
              <Pencil strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleDelete} disabled={deleting}>
              <Trash2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CaseNotesPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { notes, loading, error, refetch } = useClientNotes(clientId)
  const [showForm, setShowForm] = useState(false)
  const [noteType, setNoteType] = useState(NOTE_CATEGORIES[0])
  const [content, setContent] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

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
                  Category
                </label>
                <select id="note-type" className="input" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {NOTE_CATEGORIES.map((t) => (
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
            {notes.map((n) => (
              <NoteItem
                key={n.id}
                note={n}
                canEdit={isAdminManager || n.created_by === user?.id}
                canDelete={isAdminManager}
                onUpdated={refetch}
                onDeleted={refetch}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
