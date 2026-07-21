import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { DEAL_STAGES, mockDeals } from '../data/mockDeals.js'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const emptyForm = {
  title: '',
  company: '',
  value: '',
  stage: DEAL_STAGES[0].key,
  closeDate: '',
  owner: '',
}

export default function Deals() {
  const [deals, setDeals] = useState(mockDeals)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [dragOverStage, setDragOverStage] = useState(null)

  const moveDeal = (dealId, stage) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage } : d)))
  }

  const handleDrop = (stage) => (e) => {
    e.preventDefault()
    const dealId = Number(e.dataTransfer.getData('text/plain'))
    if (dealId) moveDeal(dealId, stage)
    setDragOverStage(null)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setDeals((prev) => [
      {
        id: Date.now(),
        title: form.title.trim(),
        company: form.company.trim(),
        value: Number(form.value) || 0,
        stage: form.stage,
        closeDate: form.closeDate,
        owner: form.owner.trim().slice(0, 2).toUpperCase() || '—',
      },
      ...prev,
    ])
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">Deals Pipeline</div>
          <div className="section-subtitle">{deals.length} total deals</div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Deal
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="deal-title">
                  Deal Title
                </label>
                <input
                  id="deal-title"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="deal-company">
                  Company
                </label>
                <input
                  id="deal-company"
                  className="input"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="deal-value">
                  Value ($)
                </label>
                <input
                  id="deal-value"
                  type="number"
                  min="0"
                  className="input"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="deal-stage">
                  Stage
                </label>
                <select
                  id="deal-stage"
                  className="input"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  {DEAL_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="deal-date">
                  Close Date
                </label>
                <input
                  id="deal-date"
                  type="date"
                  className="input"
                  value={form.closeDate}
                  onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="deal-owner">
                  Owner
                </label>
                <input
                  id="deal-owner"
                  className="input"
                  placeholder="Initials, e.g. JD"
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Deal</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="kanban-board">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key)
          const total = stageDeals.reduce((sum, d) => sum + d.value, 0)

          return (
            <div className="kanban-column" key={stage.key}>
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  {stage.label} <span className="kanban-column-count">({stageDeals.length})</span>
                </div>
                <div className="kanban-column-total">{currency.format(total)}</div>
              </div>

              <div
                className={`kanban-column-body${dragOverStage === stage.key ? ' drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverStage(stage.key)
                }}
                onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
                onDrop={handleDrop(stage.key)}
              >
                {stageDeals.length === 0 ? (
                  <div className="kanban-empty">Drop a deal here</div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(deal.id))}
                    >
                      <Card className="deal-card">
                        <div className="deal-card-title">{deal.title}</div>
                        <div className="deal-card-company">{deal.company}</div>
                        <div className="deal-card-value">{currency.format(deal.value)}</div>
                        <div className="deal-card-footer">
                          <span className="deal-card-date">
                            <Calendar strokeWidth={2} />
                            {deal.closeDate || '—'}
                          </span>
                          <span className="deal-card-owner">{deal.owner}</span>
                        </div>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
