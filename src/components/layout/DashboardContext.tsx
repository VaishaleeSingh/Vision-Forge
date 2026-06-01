'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface DashboardContextType {
  isMobileOpen: boolean
  setIsMobileOpen: (val: boolean) => void
  isSearchOpen: boolean
  setIsSearchOpen: (val: boolean) => void
}

const DashboardContext = createContext<DashboardContextType>({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  isSearchOpen: false,
  setIsSearchOpen: () => {},
})

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <DashboardContext.Provider value={{ isMobileOpen, setIsMobileOpen, isSearchOpen, setIsSearchOpen }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext)
}
