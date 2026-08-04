import { createContext, useContext, type ReactNode } from 'react'

const SplashDoneContext = createContext(false)

export function SplashDoneProvider({
  value,
  children,
}: {
  value: boolean
  children: ReactNode
}) {
  return (
    <SplashDoneContext.Provider value={value}>{children}</SplashDoneContext.Provider>
  )
}

export function useSplashDone() {
  return useContext(SplashDoneContext)
}
