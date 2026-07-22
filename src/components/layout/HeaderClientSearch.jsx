import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listClients } from '../../services/clientService.js'
import { initials } from '../../utils/initials.js'
import { avatarTone } from '../../utils/avatarColor.js'

export default function HeaderClientSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults([])
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      listClients({ search: term })
        .then((data) => {
          if (!cancelled) setResults(data.slice(0, 6))
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
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
            results.map((c) => {
              const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ')
              return (
                <div key={c.id} className="header-search-result" onMouseDown={() => goToClient(c.id)}>
                  <div className={`client-avatar avatar--${avatarTone(fullName)}`}>{initials(fullName)}</div>
                  <div>
                    <div className="header-search-result-name">{fullName}</div>
                    <div className="header-search-result-meta">{c.client_number}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
