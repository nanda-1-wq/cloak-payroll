import { createContext, useContext, useState, type ReactNode } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pp_theme') !== 'light'
    } catch {
      return true
    }
  })

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev
      try { localStorage.setItem('pp_theme', next ? 'dark' : 'light') } catch {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/** Derive all semantic colors from the current theme. */
export function themeColors(isDark: boolean) {
  return isDark ? {
    pageBg:     '#07070e',
    navBg:      '#0a0a14',
    navBorder:  '#1e1e3a',
    sectionBg:  '#0a0a14',
    cardBg:     '#0f0f1a',
    rowBg:      '#16162a',
    border:     '#1e1e3a',
    borderBold: '#2e2e5a',
    heading:    '#f1f5f9',
    body:       '#e2e8f0',
    muted:      '#64748b',
    faint:      '#4a5568',
    inputBg:    '#16162a',
    inputText:  '#e2e8f0',
    logoText:   '#e2e8f0',
  } : {
    pageBg:     '#f8fafc',
    navBg:      '#ffffff',
    navBorder:  '#e2e8f0',
    sectionBg:  '#f1f5f9',
    cardBg:     '#ffffff',
    rowBg:      '#f8fafc',
    border:     '#e2e8f0',
    borderBold: '#cbd5e1',
    heading:    '#0f172a',
    body:       '#1e293b',
    muted:      '#475569',
    faint:      '#94a3b8',
    inputBg:    '#f8fafc',
    inputText:  '#0f172a',
    logoText:   '#0f172a',
  }
}
