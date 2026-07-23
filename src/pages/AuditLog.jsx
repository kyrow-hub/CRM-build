import { useMemo, useState } from 'react'
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAuditLog } from '../hooks/useAuditLog.js'
import { AUDITED_TABLES } from '../services/auditLogService.js'
import { useAuth } from '../context/AuthContext.jsx'

const ACTION_OPTIONS = ['INSERT', 'UPDATE', 'DELETE']
const ACTION_TONE = { INSERT: 'success', UPDATE: 'info', DELETE: 'danger' }
const ACTION_LABEL = { INSERT: 'Created', UPDATE: 'Updated', DELETE: 'Deleted' }

// Noisy on every update (bumped by the set_updated_at trigger regardless
// of what else changed) and not meaningful signal in a diff view.
const DIFF_IGNORE_FIELDS = new Set(['updated_at'])

function tableLabel(tableName) {
  return AUDITED_TABLES.find((t) => t.value === tableName)?.label ?? tableName
}

function formatValue(value) {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function computeChangedFields(oldData, newData) {
  if (!oldData || !newData) return []
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  const changed = []
  for (const key of keys) {
    if (DIFF_IGNORE_FIELDS.has(key)) continue
    const before = oldData[key]
    const after = newData[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.push({ field: key, before, after })
    }
  }
  return changed
}

function AuditEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const actorName = entry.actor
    ? [entry.actor.first_name, entry.actor.last_name].filter(Boolean).join(' ') || entry.actor.email
    : 'Unknown user'

  const changedFields = entry.action === 'UPDATE' ? computeChangedFields(entry.old_data, entry.new_data) : []
  const snapshot = entry.action === 'DELETE' ? entry.old_data : entry.action === 'INSERT' ? entry.new_data : null

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusPill tone={ACTION_TONE[entry.action] ?? 'neutral'}>{ACTION_LABEL[entry.action] ?? entry.action}</StatusPill>
          <span style={{ fontWeight: 600 }}>{tableLabel(entry.table_name)}</span>
        </div>
        <span>{new Date(entry.created_at).toLocaleString()}</span>
      </div>
      <div className="data-cell-muted" style={{ marginBottom: 6 }}>
        by {actorName} · record {entry.record_id}
      </div>
      <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
        {expanded ? <ChevronUp strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} /> : <ChevronDown strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />}
        {expanded ? 'Hide details' : 'View details'}
      </button>
      {expanded && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {entry.action === 'UPDATE' ? (
            changedFields.length === 0 ? (
              <div className="data-cell-muted">No field-level changes recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {changedFields.map(({ field, before, after }) => (
                  <div key={field}>
                    <span style={{ fontWeight: 600 }}>{field}</span>
                    <span className="data-cell-muted"> · {formatValue(before)} → </span>
                    {formatValue(after)}
                  </div>
                ))}
              </div>
            )
          ) : snapshot ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(snapshot)
                .filter(([field]) => !DIFF_IGNORE_FIELDS.has(field))
                .map(([field, value]) => (
                  <div key={field}>
                    <span style={{ fontWeight: 600 }}>{field}</span>
                    <span className="data-cell-muted"> · {formatValue(value)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="data-cell-muted">No data recorded.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AuditLog() {
  const { profile } = useAuth()
  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState('')
  const [recordId, setRecordId] = useState('')
  const filters = useMemo(() => ({ tableName, action, recordId }), [tableName, action, recordId])
  const { entries, loading, error } = useAuditLog(filters)

  if (!isAdminManager) {
    return (
      <div className="fade-up">
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="Restricted"
            text="The audit log is only visible to administrators and managers."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">Audit Log</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${entries.length} recent change${entries.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 180 }} value={tableName} onChange={(e) => setTableName(e.target.value)}>
            <option value="">All records</option>
            {AUDITED_TABLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select className="input" style={{ width: 150 }} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="Filter by record ID..."
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
          />
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={ShieldCheck} title="Loading audit log..." text="Fetching recent changes." />
        ) : error ? (
          <EmptyState icon={ShieldCheck} title="Couldn't load audit log" text={error} />
        ) : entries.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No changes found" text="Nothing matches the current filters yet." />
        ) : (
          <div className="note-list">
            {entries.map((entry) => (
              <AuditEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
