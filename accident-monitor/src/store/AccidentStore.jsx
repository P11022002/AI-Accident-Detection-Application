import { createContext, useContext, useMemo } from 'react'
import useAccidents from '../hooks/useAccidents'

const AccidentContext = createContext(null)

export function AccidentProvider({ children }) {
  const accidentsState = useAccidents()
  const value = useMemo(() => accidentsState, [accidentsState])

  return (
    <AccidentContext.Provider value={value}>
      {children}
    </AccidentContext.Provider>
  )
}

export function useAccidentStore() {
  const context = useContext(AccidentContext)
  if (!context) {
    throw new Error('useAccidentStore must be used inside AccidentProvider')
  }
  return context
}
