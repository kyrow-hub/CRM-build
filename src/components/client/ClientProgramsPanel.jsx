import { BookOpen } from 'lucide-react'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { useClientProgramSummary } from '../../hooks/useClientProgramSummary.js'

export default function ClientProgramsPanel({ clientId, clientName }) {
  const { programs, loading, error } = useClientProgramSummary(clientId)

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Programs</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${programs.length} ${programs.length === 1 ? 'program' : 'programs'} attended by ${clientName}`}
          </div>
        </div>
      </div>

      <Card style={!loading && programs.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={BookOpen} title="Loading programs..." text="Fetching this client's program attendance." />
        ) : error ? (
          <EmptyState icon={BookOpen} title="Couldn't load programs" text={error} />
        ) : programs.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Not enrolled in any programs"
            text="Programs this client attends via Attendance Register will appear here, derived from their attendance history."
          />
        ) : (
          <div className="data-table">
            <div className="data-row program-summary-row data-row--head">
              <span>Program</span>
              <span>Location</span>
              <span>Sessions</span>
              <span>First Attended</span>
              <span>Last Attended</span>
              <span>Present Rate</span>
            </div>
            {programs.map((p) => (
              <div className="data-row program-summary-row" key={p.id}>
                <span>{p.name}</span>
                <span className="data-cell-muted">{p.location || '—'}</span>
                <span className="data-cell-muted">{p.sessionsAttended}</span>
                <span className="data-cell-muted">{p.firstDate}</span>
                <span className="data-cell-muted">{p.lastDate}</span>
                <span className="data-cell-muted">
                  {p.sessionsAttended ? `${Math.round((p.presentCount / p.sessionsAttended) * 100)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
