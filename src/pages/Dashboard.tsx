import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { usePayroll } from '../context/PayrollContext'
import { useTheme, themeColors } from '../context/ThemeContext'
import {
  Users, DollarSign, Play, Clock, TrendingUp, ChevronRight,
  CheckCircle, AlertCircle, ExternalLink, Shield
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color, c }: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
  color: string
  c: ReturnType<typeof themeColors>
}) {
  return (
    <div style={{
      backgroundColor: c.cardBg,
      border: `1px solid ${c.border}`,
      borderRadius: 16, padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: c.heading, marginBottom: 4, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: c.muted, marginBottom: sub ? 4 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { connected, publicKey } = useWallet()
  const { employees, payrollHistory } = usePayroll()
  const { isDark } = useTheme()
  const c = themeColors(isDark)

  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0)
  const lastRun = payrollHistory[0]

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Shield size={32} color="#a78bfa" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.5px', color: c.heading }}>
          Connect your wallet
        </h2>
        <p style={{ color: c.muted, fontSize: 16, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
          Connect your Phantom wallet to access the employer dashboard and manage payroll.
        </p>
        <WalletMultiButton />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>
              Payroll Dashboard
            </h1>
            <p style={{ color: c.muted, fontSize: 14 }}>
              Wallet: <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
                {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}
              </span>
            </p>
          </div>
          <Link
            to="/payroll"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: 'white', textDecoration: 'none',
              padding: '10px 24px', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Play size={15} /> Run Payroll
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard c={c} icon={Users} label="Total Employees" value={employees.length.toString()} sub="Active on payroll" color="#8b5cf6" />
        <StatCard c={c} icon={DollarSign} label="Monthly Payroll" value={`$${totalPayroll.toLocaleString()}`} sub="USDC per month" color="#06b6d4" />
        <StatCard c={c} icon={TrendingUp} label="Payroll Runs" value={payrollHistory.length.toString()} sub="All completed" color="#10b981" />
        <StatCard
          c={c}
          icon={Clock}
          label="Last Payment"
          value={lastRun ? lastRun.date : 'Never'}
          sub={lastRun ? `$${lastRun.totalAmount.toLocaleString()} sent` : undefined}
          color="#f59e0b"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent payroll history */}
        <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.heading }}>Recent Payroll Runs</h3>
            <Link to="/compliance" style={{ fontSize: 12, color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payrollHistory.slice(0, 4).map(run => (
              <div key={run.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: c.rowBg,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {run.status === 'completed'
                    ? <CheckCircle size={16} color="#10b981" />
                    : <AlertCircle size={16} color="#f59e0b" />
                  }
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.body }}>{run.date}</div>
                    <div style={{ fontSize: 12, color: c.muted }}>{run.employeeCount} employees</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                    ${run.totalAmount.toLocaleString()}
                  </div>
                  <a
                    href={`https://explorer.solana.com/tx/${run.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}
                  >
                    Explorer <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
            {payrollHistory.length === 0 && (
              <p style={{ color: c.faint, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No payroll runs yet.</p>
            )}
          </div>
        </div>

        {/* Employee list preview */}
        <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.heading }}>Employees</h3>
            <Link to="/employees" style={{ fontSize: 12, color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage <ChevronRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {employees.map(emp => (
              <div key={emp.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: c.rowBg,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #7c3aed44, #06b6d444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#a78bfa',
                  }}>
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.body }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: c.muted }}>{emp.department}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.body }}>
                  ${emp.salary.toLocaleString()}<span style={{ fontSize: 11, color: c.muted, fontWeight: 400 }}>/mo</span>
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <p style={{ color: c.faint, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No employees added yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
        {[
          { to: '/employees', label: 'Add Employee', icon: Users, color: '#8b5cf6' },
          { to: '/payroll', label: 'Run Payroll', icon: Play, color: '#06b6d4' },
          { to: '/compliance', label: 'View Report', icon: CheckCircle, color: '#10b981' },
        ].map(action => (
          <Link
            key={action.to}
            to={action.to}
            style={{
              backgroundColor: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 12, padding: '16px 20px',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <action.icon size={18} color={action.color} />
            <span style={{ fontSize: 14, fontWeight: 600, color: c.body }}>{action.label}</span>
            <ChevronRight size={14} color={c.faint} style={{ marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
