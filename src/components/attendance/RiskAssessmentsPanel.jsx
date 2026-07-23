import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Trash2, ShieldAlert, Tent, File } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useRiskAssessmentDocuments } from '../../hooks/useRiskAssessmentDocuments.js'
import { uploadDocument, getDocumentDownloadUrl, deleteClientDocument } from '../../services/documentService.js'
import { listCampSessions } from '../../services/programService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const ANNUAL_DAYS = 365
const DUE_SOON_DAYS = 30

const daysAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 3600 * 1000))

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_LABEL = { current: 'Current', 'due-soon': 'Due Soon', overdue: 'Overdue', missing: 'Missing' }
const STATUS_TONE = { current: 'success', 'due-soon': 'warning', overdue: 'danger', missing: 'danger' }

function DocumentRow({ doc, canDelete, currentUserId, onDeleted }) {
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const uploaderName = doc.uploader ? [doc.uploader.first_name, doc.uploader.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unknown'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = await getDocumentDownloadUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteClientDocument(doc)
      toast.success('Document deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 6 }}>
      <File strokeWidth={2} style={{ width: 14, height: 14, color: 'var(--muted)', flexShrink: 0 }} />
      <span className="data-cell-muted">
        {doc.file_name} · {formatFileSize(doc.file_size)} · {uploaderName} · {new Date(doc.created_at).toLocaleDateString()}
      </span>
      <button type="button" className="link-button" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Opening...' : 'Download'}
      </button>
      {(canDelete || doc.uploaded_by === currentUserId) && (
        <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </div>
  )
}

function UploadButton({ label, onUpload, uploading }) {
  const fileInputRef = useRef(null)
  return (
    <>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], fileInputRef)} />
      <button type="button" className="link-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        <Upload strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
        {uploading ? 'Uploading...' : label}
      </button>
    </>
  )
}

export default function RiskAssessmentsPanel({ programs }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { documents, loading, error, refetch } = useRiskAssessmentDocuments()
  const [campSessions, setCampSessions] = useState([])
  const [campSessionsLoading, setCampSessionsLoading] = useState(true)
  const [uploadingFor, setUploadingFor] = useState(null)

  const canDelete = profile?.role === 'administrator' || profile?.role === 'manager'

  useEffect(() => {
    setCampSessionsLoading(true)
    listCampSessions()
      .then(setCampSessions)
      .catch(() => setCampSessions([]))
      .finally(() => setCampSessionsLoading(false))
  }, [])

  const programDocs = documents.filter((d) => d.program_id && !d.program_session_id)
  const campDocs = documents.filter((d) => d.program_session_id)

  const handleUpload = async (programId, programSessionId, file, fileInputRef) => {
    const key = programSessionId ? `camp-${programSessionId}` : `program-${programId}`
    setUploadingFor(key)
    try {
      await uploadDocument({
        programId,
        programSessionId,
        documentType: 'Risk Assessment',
        file,
        confidential: false,
        uploadedBy: user?.id,
      })
      toast.success('Risk assessment uploaded.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingFor(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const programStatus = (programId) => {
    const forProgram = programDocs.filter((d) => d.program_id === programId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    if (forProgram.length === 0) return { status: 'missing', latest: null }
    const latest = forProgram[0]
    const age = daysAgo(latest.created_at)
    if (age > ANNUAL_DAYS) return { status: 'overdue', latest }
    if (age > ANNUAL_DAYS - DUE_SOON_DAYS) return { status: 'due-soon', latest }
    return { status: 'current', latest }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Risk Assessments</div>
          <div className="section-subtitle">
            Risk assessments are created externally and uploaded here. Programs and activities need one every year; every camp needs its own.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="section-subtitle" style={{ marginBottom: 10, fontWeight: 700, color: 'var(--text)' }}>
          Programs &amp; Activities (Annual)
        </div>
        <Card style={programs.length === 0 ? undefined : { padding: 0 }}>
          {loading ? (
            <EmptyState icon={ShieldAlert} title="Loading..." text="Fetching risk assessment documents." />
          ) : error ? (
            <EmptyState icon={ShieldAlert} title="Couldn't load risk assessments" text={error} />
          ) : programs.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No programs yet" text="Add a program from the Register tab first." />
          ) : (
            <div className="note-list">
              {programs.map((program) => {
                const { status, latest } = programStatus(program.id)
                const docsForProgram = programDocs.filter((d) => d.program_id === program.id)
                return (
                  <div className="note-item" key={program.id}>
                    <div className="note-item-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{program.name}</span>
                        <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>
                      </div>
                      <span>{latest ? `Last uploaded ${new Date(latest.created_at).toLocaleDateString()}` : 'Never uploaded'}</span>
                    </div>
                    {docsForProgram.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} canDelete={canDelete} currentUserId={user?.id} onDeleted={refetch} />
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <UploadButton
                        label="Upload Risk Assessment"
                        uploading={uploadingFor === `program-${program.id}`}
                        onUpload={(file, ref) => handleUpload(program.id, null, file, ref)}
                      />
                    </div>
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
                const docsForSession = campDocs.filter((d) => d.program_session_id === session.id)
                return (
                  <div className="note-item" key={session.id}>
                    <div className="note-item-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{session.program?.name ?? 'Program'}</span>
                        <StatusPill tone={docsForSession.length > 0 ? 'success' : 'danger'}>{docsForSession.length > 0 ? 'Complete' : 'Missing'}</StatusPill>
                      </div>
                      <span>
                        {session.session_date}
                        {session.location ? ` · ${session.location}` : ''}
                      </span>
                    </div>
                    {docsForSession.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} canDelete={canDelete} currentUserId={user?.id} onDeleted={refetch} />
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <UploadButton
                        label={docsForSession.length > 0 ? 'Upload Another' : 'Upload Risk Assessment'}
                        uploading={uploadingFor === `camp-${session.id}`}
                        onUpload={(file, ref) => handleUpload(session.program.id, session.id, file, ref)}
                      />
                    </div>
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
