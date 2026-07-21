import { createContext, useCallback, useContext, useState } from 'react'
import { mockPartners } from '../data/mockPartners.js'

const PartnersContext = createContext(null)

export function PartnersProvider({ children }) {
  const [partners, setPartners] = useState(mockPartners)

  const addPartner = useCallback((partner) => {
    setPartners((prev) => [{ id: Date.now(), contacts: [], ...partner }, ...prev])
  }, [])

  const addContact = useCallback((partnerId, contact) => {
    setPartners((prev) =>
      prev.map((p) =>
        p.id === partnerId ? { ...p, contacts: [...p.contacts, { id: Date.now(), ...contact }] } : p,
      ),
    )
  }, [])

  return (
    <PartnersContext.Provider value={{ partners, addPartner, addContact }}>{children}</PartnersContext.Provider>
  )
}

export function usePartners() {
  const ctx = useContext(PartnersContext)
  if (!ctx) throw new Error('usePartners must be used within a PartnersProvider')
  return ctx
}
