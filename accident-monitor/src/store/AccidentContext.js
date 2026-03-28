import { createContext, useContext } from 'react'

const AccidentContext = createContext(null)

export function useAccidentStore() {
  const context = useContext(AccidentContext)
  if (!context) {
    throw new Error('useAccidentStore must be used inside AccidentProvider')
  }
  return context
}

export default AccidentContext
