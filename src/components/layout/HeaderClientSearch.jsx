import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { mockClients } from '../../data/mockClients.js'

function matchesClient(client, query) {
  const parts = client.name.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName = parts[parts.length - 1] ?? ''
  return firstName.toLowerCase().includes(query) || lastName.toLowerCase().includes(query)
}

export default function HeaderClientSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return mockClients.filter((c) => matchesClient(c, q)).slice(0, 6)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const goToClient = (id) => {
    navigate(`/clients/${id}`)
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter' && results.length > 0) {
      goToClient(results[0].id)
    }
  }

  return (
    <div className="header-search" ref={wrapperRef}>
      <div className="search-input">
        <Search strokeWidth={2} />
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Find a client by first or last name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && query.trim() && (
        <div className="header-search-results">
          {results.length === 0 ? (
            <div className="header-search-empty">No clients match "{query.trim()}"</div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                className="header-search-result"
                onMouseDown={() => goToClient(c.id)}
              >
                <div className="client-avatar">{c.initials}</div>
                <div>
                  <div className="header-search-result-name">{c.name}</div>
                  <div className="header-search-result-meta">{c.company}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
