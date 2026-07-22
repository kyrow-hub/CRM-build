import { useRef, useState } from 'react'
import { Upload, Download, Trash2, Folder, File } from 'lucide-react'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useReferralDocuments } from '../../hooks/useReferralDocuments.js'
import { uploadDocument, getDocumentDownloadUrl, deleteClientDocument } from '../../services/documentService.js'
import { DOCUMENT_TYPES } from '../../data/documentTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ReferralDocumentsPanel({ referralId, clientId }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { documents, loading, error, refetch } = useReferralDocuments(referralId)
  const fileInputRef = useRef(null)
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [confidential, setConfidential] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const canManageAll = profile?.role === 'administrator' || profile?.role === 'manager'

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadDocument({ referralId, clientId: clientId || null, documentType, file, confidential, uploadedBy: user?.id })
      toast.success(clientId ? 'Document uploaded and added to client Documents.' : 'Document uploaded.')
      setConfidential(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id)
    try {
      const url = await getDocumentDownloadUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      await deleteClientDocument(doc)
      toast.success('Document deleted.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 180 }} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="checkbox-field" style={{ marginTop: 0 }}>
          <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
          <span>Confidential</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
        />
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload strokeWidth={2} />
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        {!clientId && (
          <span className="data-cell-muted">Not linked to a client yet - link this referral to move documents to a client's Documents tab automatically.</span>
        )}
      </div>

      {loading ? (
        <EmptyState icon={Folder} title="Loading documents..." text="Fetching documents for this referral." />
      ) : error ? (
        <EmptyState icon={Folder} title="Couldn't load documents" text={error} />
      ) : documents.length === 0 ? (
        <EmptyState icon={Folder} title="No documents uploaded" text="Referral forms, school reports, and other files can be attached here. Max 20 MB per file." />
      ) : (
        <div className="note-list">
          {documents.map((d) => {
            const uploaderName = d.uploader
              ? [d.uploader.first_name, d.uploader.last_name].filter(Boolean).join(' ') || 'Unknown'
              : 'Unknown'
            const canDelete = canManageAll || d.uploaded_by === user?.id
            return (
              <div className="note-item" key={d.id}>
                <div className="note-item-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <File strokeWidth={2} style={{ width: 15, height: 15, color: 'var(--muted)' }} />
                    <span>
                      {d.file_name} · {formatFileSize(d.file_size)} · {uploaderName}
                    </span>
                    {d.document_type && <StatusPill tone="info">{d.document_type}</StatusPill>}
                    {d.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
                  </div>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="link-button" onClick={() => handleDownload(d)} disabled={downloadingId === d.id}>
                    <Download strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                    {downloadingId === d.id ? 'Opening...' : 'Download'}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleDelete(d)}
                      disabled={deletingId === d.id}
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                      {deletingId === d.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
