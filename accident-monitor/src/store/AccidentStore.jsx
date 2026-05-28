import { useMemo } from 'react'
import useAccidents from '../hooks/useAccidents'
import AccidentContext from './AccidentContext'

export function AccidentProvider({ children }) {
  const accidentsState = useAccidents()
  const value = useMemo(() => accidentsState, [accidentsState])

  return (
    <AccidentContext.Provider value={value}>
      {children}
    </AccidentContext.Provider>
  )
}
