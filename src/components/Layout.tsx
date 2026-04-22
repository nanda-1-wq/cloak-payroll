import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  LayoutDashboard, Users, Play, Eye, FileText,
  Shield, Menu, X, Sun, Moon,
} from 'lucide-react'
import { useTheme, themeColors } from '../context/ThemeContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/payroll', label: 'Run Payroll', icon: Play },
  { to: '/employee', label: 'My Balance', icon: Eye },
  { to: '/compliance', label: 'Compliance', icon: FileText },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isDark, toggle } = useTheme()
  const c = themeColors(isDark)

  const isActive = (to: string) => location.pathname === to

  return (
    <div style={{ minHeight: '100vh', backgroundColor: c.pageBg, display: 'flex', flexDirection: 'column', color: c.body }}>
      {/* Top nav */}
      <header style={{
        backgroundColor: c.navBg,
        borderBottom: `1px solid ${c.navBorder}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginRight: 48 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: c.logoText, letterSpacing: '-0.5px' }}>
              Private<span style={{ color: '#8b5cf6' }}>Payroll</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 4, flex: 1 }} className="hidden-mobile">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive(item.to) ? '#a78bfa' : c.muted,
                  backgroundColor: isActive(item.to) ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Devnet badge */}
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
              color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '3px 8px', borderRadius: 6,
            }}>
              DEVNET
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'none',
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: c.muted,
                flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <WalletMultiButton />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', color: c.muted, cursor: 'pointer', padding: 4 }}
              className="show-mobile"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{ borderTop: `1px solid ${c.navBorder}`, padding: '8px 16px 16px', backgroundColor: c.navBg }}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14, fontWeight: 500,
                  color: isActive(item.to) ? '#a78bfa' : c.muted,
                  backgroundColor: isActive(item.to) ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', padding: '40px 24px', width: '100%' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${c.navBorder}`,
        padding: '20px 24px',
        textAlign: 'center',
        color: c.faint,
        fontSize: 13,
        backgroundColor: c.navBg,
      }}>
        <span>PrivatePayroll - Powered by </span>
        <span style={{ color: '#8b5cf6' }}>Umbra Privacy SDK</span>
        <span> on Solana Devnet</span>
      </footer>
    </div>
  )
}
