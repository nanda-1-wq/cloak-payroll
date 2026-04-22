import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { usePayroll } from '../context/PayrollContext'
import { useTheme, themeColors } from '../context/ThemeContext'
import { Link } from 'react-router-dom'
import {
  Play, Lock, Shield, CheckCircle, AlertCircle, ExternalLink,
  Loader2, Users, DollarSign, Zap, Info, UserPlus,
} from 'lucide-react'
import {
  initUmbraClient,
  isRegistered,
  registerWithUmbra,
  sendPrivatePayroll,
  findUnregisteredEmployees,
  DEMO_MODE,
} from '../lib/umbra'

type Step = 'review' | 'registering' | 'checking' | 'confirming' | 'processing' | 'complete' | 'error'

export default function RunPayroll() {
  const { connected, publicKey, wallet } = useWallet()
  const { employees, addPayrollRun } = usePayroll()
  const { isDark } = useTheme()
  const c = themeColors(isDark)

  const [step, setStep] = useState<Step>('review')
  const [txSigs, setTxSigs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [currentEmpIndex, setCurrentEmpIndex] = useState(-1)
  const [paidIndices, setPaidIndices] = useState<Set<number>>(new Set())
  const [errorMsg, setErrorMsg] = useState('')
  const [unregisteredEmps, setUnregisteredEmps] = useState<string[]>([])

  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0)
  const today = new Date().toISOString().split('T')[0]

  const runPayroll = async () => {
    if (!publicKey || !wallet) return
    setErrorMsg('')

    try {
      setStep('registering')
      const client = await initUmbraClient(wallet, publicKey.toBase58())

      const alreadyRegistered = await isRegistered(client)
      if (!alreadyRegistered) {
        await registerWithUmbra(client)
      }

      setStep('checking')
      const walletAddresses = employees.map((e) => e.walletAddress)
      const unregistered = await findUnregisteredEmployees(client, walletAddresses)
      if (unregistered.length > 0) {
        setUnregisteredEmps(unregistered)
        throw new Error(
          `${unregistered.length} employee wallet${unregistered.length > 1 ? 's are' : ' is'} not registered with Umbra. ` +
          `They must connect to the Employee Portal and complete Umbra registration before receiving payroll.`
        )
      }

      setStep('confirming')
      await delay(600)
      setStep('processing')

      const signatures: string[] = []

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        setCurrentEmpIndex(i)
        setProgress(Math.round(((i + 0.5) / employees.length) * 100))

        const sig = await sendPrivatePayroll(client, emp.walletAddress, emp.salary)
        signatures.push(sig)

        setPaidIndices(prev => new Set(prev).add(i))
        setProgress(Math.round(((i + 1) / employees.length) * 100))
      }
      setCurrentEmpIndex(-1)

      setTxSigs(signatures)
      addPayrollRun({
        date: today,
        totalAmount: totalPayroll,
        employeeCount: employees.length,
        txSignature: signatures[signatures.length - 1] ?? '',
        status: 'completed',
      })
      setStep('complete')
    } catch (err: unknown) {
      console.error('Payroll failed:', err)
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStep('error')
    }
  }

  const reset = () => {
    setStep('review')
    setProgress(0)
    setCurrentEmpIndex(-1)
    setPaidIndices(new Set())
    setTxSigs([])
    setErrorMsg('')
    setUnregisteredEmps([])
  }

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <Shield size={40} color="#8b5cf6" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: c.heading }}>Connect Wallet</h2>
        <p style={{ color: c.muted, marginBottom: 28 }}>Connect your employer wallet to run payroll.</p>
        <WalletMultiButton />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>Run Payroll</h1>
        <p style={{ color: c.muted, fontSize: 14 }}>
          All transfers are encrypted using Umbra's stealth address protocol. Amounts and recipients stay private.
        </p>
      </div>

      {/* Demo mode banner */}
      {DEMO_MODE && (
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 15 }}>🎬</span>
          <div style={{ fontSize: 13, color: '#fbbf24' }}>
            <strong>Demo mode</strong> - transactions are simulated locally. ZK proofs, stealth addresses,
            and all privacy guarantees are real in production. Devnet MPC pools are pending activation.
          </div>
        </div>
      )}

      {/* Review step */}
      {step === 'review' && (
        <>
          {/* Privacy notice */}
          <div style={{
            backgroundColor: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20,
          }}>
            <Lock size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: '#c4b5fd' }}>
              <strong>Privacy guaranteed:</strong> Salary amounts are encrypted using ZK proofs. Recipient
              addresses are one-time stealth addresses. No one on-chain can see who received what amount.
            </div>
          </div>

          {/* Summary card */}
          <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: c.muted }}>Payroll Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { icon: Users, label: 'Employees', value: employees.length.toString(), color: '#8b5cf6' },
                { icon: DollarSign, label: 'Total Amount', value: `$${totalPayroll.toLocaleString()}`, color: '#06b6d4' },
                { icon: Zap, label: 'Pay Date', value: today, color: '#10b981' },
              ].map(s => (
                <div key={s.label} style={{
                  backgroundColor: c.rowBg, borderRadius: 12, padding: '16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  border: `1px solid ${c.border}`,
                }}>
                  <s.icon size={20} color={s.color} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: c.heading }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: c.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee breakdown */}
          <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.muted }}>Payment Breakdown</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.muted }}>
                <Lock size={12} />
                Amounts encrypted on-chain
              </div>
            </div>

            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: c.faint }}>
                <p>No employees added yet.</p>
                <Link to="/employees" style={{ color: '#8b5cf6', fontSize: 14, fontWeight: 600 }}>Add employees</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {employees.map((emp) => (
                  <div key={emp.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: c.rowBg, borderRadius: 10,
                    border: `1px solid ${c.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: 'linear-gradient(135deg, #7c3aed33, #06b6d433)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#a78bfa',
                      }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: c.body }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: c.faint, fontFamily: 'monospace' }}>
                          {emp.walletAddress.slice(0, 6)}...{emp.walletAddress.slice(-4)} (stealth)
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lock size={12} color={c.faint} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
                        ${emp.salary.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: c.faint }}>USDC</span>
                    </div>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: `1px solid ${c.border}`, marginTop: 8,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.muted }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: c.heading }}>${totalPayroll.toLocaleString()} USDC</span>
                </div>
              </div>
            )}
          </div>

          {/* From wallet */}
          <div style={{
            backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Info size={15} color={c.muted} />
            <div style={{ fontSize: 13, color: c.muted }}>
              Paying from:{' '}
              <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-4)}
              </span>
            </div>
          </div>

          <button
            onClick={runPayroll}
            disabled={employees.length === 0}
            style={{
              width: '100%',
              background: employees.length === 0
                ? (isDark ? '#1e1e3a' : '#e2e8f0')
                : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: employees.length === 0 ? c.faint : 'white',
              border: 'none', borderRadius: 12,
              padding: '16px', cursor: employees.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: employees.length > 0 ? '0 0 40px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            <Play size={18} />
            Send Private Payroll - ${totalPayroll.toLocaleString()} USDC
          </button>
        </>
      )}

      {/* Registering step */}
      {step === 'registering' && (
        <div style={{
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <UserPlus size={32} color="#a78bfa" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: c.heading }}>Setting Up Umbra</h2>
          <p style={{ color: c.muted, fontSize: 15 }}>
            Registering your wallet with the Umbra privacy protocol.
            Approve the signing prompt in Phantom.
          </p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#a78bfa' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Generating ZK registration proof...</span>
          </div>
        </div>
      )}

      {/* Checking step */}
      {step === 'checking' && (
        <div style={{
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Users size={32} color="#06b6d4" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: c.heading }}>Verifying Recipients</h2>
          <p style={{ color: c.muted, fontSize: 15 }}>
            Checking that all employees have registered with Umbra...
          </p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#06b6d4' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Querying on-chain accounts...</span>
          </div>
        </div>
      )}

      {/* Confirming step */}
      {step === 'confirming' && (
        <div style={{
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Loader2 size={32} color="#fbbf24" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: c.heading }}>Confirm in Phantom</h2>
          <p style={{ color: c.muted, fontSize: 15 }}>Approve the transaction in your Phantom wallet to proceed.</p>
        </div>
      )}

      {/* Processing step */}
      {step === 'processing' && (
        <div style={{
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 16, padding: '32px 28px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={24} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: c.heading, marginBottom: 4 }}>Processing Payroll</h2>
              {currentEmpIndex >= 0 && (
                <p style={{ fontSize: 13, color: '#06b6d4', margin: 0 }}>
                  Processing {employees[currentEmpIndex]?.name} ({currentEmpIndex + 1}/{employees.length})...
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.muted, marginBottom: 6 }}>
              <span>Generating ZK proofs &amp; sending encrypted payments</span>
              <span style={{ fontWeight: 700, color: c.body }}>{progress}%</span>
            </div>
            <div style={{ height: 8, backgroundColor: c.border, borderRadius: 100 }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                borderRadius: 100, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Per-employee rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {employees.map((emp, i) => {
              const isPaid = paidIndices.has(i)
              const isActive = i === currentEmpIndex
              const isPending = !isPaid && !isActive
              return (
                <div key={emp.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px',
                  backgroundColor: isPaid
                    ? 'rgba(16,185,129,0.07)'
                    : isActive
                      ? 'rgba(6,182,212,0.07)'
                      : c.rowBg,
                  border: `1px solid ${isPaid ? 'rgba(16,185,129,0.25)' : isActive ? 'rgba(6,182,212,0.25)' : c.border}`,
                  borderRadius: 10,
                  opacity: isPending ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: 'linear-gradient(135deg, #7c3aed33, #06b6d433)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#a78bfa',
                    }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.body }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: c.muted }}>{emp.department}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                      ${emp.salary.toLocaleString()}
                    </span>
                    {isPaid && <CheckCircle size={16} color="#10b981" />}
                    {isActive && <Loader2 size={16} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />}
                    {isPending && (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${c.border}` }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: c.faint, textAlign: 'center' }}>Do not close this window</p>
        </div>
      )}

      {/* Complete step */}
      {step === 'complete' && (
        <div style={{
          backgroundColor: c.cardBg, border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: c.heading }}>Payroll Complete!</h2>
          <p style={{ color: c.muted, marginBottom: 8 }}>
            {employees.length} employee{employees.length !== 1 ? 's' : ''} paid privately.{' '}
            ${totalPayroll.toLocaleString()} USDC sent.
          </p>
          <p style={{ color: c.faint, fontSize: 13, marginBottom: 28 }}>
            All transfers were encrypted on-chain using Umbra stealth addresses.
          </p>

          {txSigs.length > 0 && (
            <div style={{
              backgroundColor: c.rowBg, borderRadius: 10, padding: '12px 16px',
              marginBottom: 28, fontFamily: 'monospace', fontSize: 11, color: c.muted,
              wordBreak: 'break-all', textAlign: 'left',
              border: `1px solid ${c.border}`,
            }}>
              {DEMO_MODE && (
                <div style={{ color: '#fbbf24', marginBottom: 6, fontFamily: 'inherit', fontSize: 11 }}>
                  Simulated signatures (demo mode)
                </div>
              )}
              {txSigs.map((sig, i) => (
                <div key={sig} style={{ marginBottom: i < txSigs.length - 1 ? 4 : 0 }}>
                  TX {i + 1}: {sig}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {txSigs.length > 0 && !DEMO_MODE && (
              <a
                href={`https://explorer.solana.com/tx/${txSigs[txSigs.length - 1]}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  backgroundColor: c.rowBg, border: `1px solid ${c.border}`,
                  color: c.body, textDecoration: 'none',
                  padding: '10px 20px', borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <ExternalLink size={14} /> View on Explorer
              </a>
            )}
            <button onClick={reset} style={{
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '10px 20px', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Play size={14} /> Run Another
            </button>
          </div>
        </div>
      )}

      {/* Error step */}
      {step === 'error' && (
        <div style={{
          backgroundColor: c.cardBg, border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          <AlertCircle size={40} color="#f87171" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: c.heading }}>Transaction Failed</h2>
          {errorMsg && (
            <div style={{
              backgroundColor: c.rowBg, borderRadius: 10,
              padding: '10px 14px', marginBottom: 20,
              fontSize: 12, color: '#f87171', fontFamily: 'monospace',
              wordBreak: 'break-word', textAlign: 'left',
              border: `1px solid ${c.border}`,
            }}>
              {errorMsg}
            </div>
          )}
          {unregisteredEmps.length > 0 ? (
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <p style={{ color: c.muted, fontSize: 14, marginBottom: 12 }}>
                The following employee wallets are not registered with Umbra.
                They must visit the <strong>Employee Portal</strong> and complete the one-time Umbra setup before they can receive private payroll:
              </p>
              <div style={{
                backgroundColor: c.rowBg, borderRadius: 10, padding: '10px 14px',
                fontFamily: 'monospace', fontSize: 11, color: '#f87171',
                border: `1px solid ${c.border}`,
              }}>
                {unregisteredEmps.map((addr) => {
                  const emp = employees.find((e) => e.walletAddress === addr)
                  return (
                    <div key={addr} style={{ marginBottom: 4 }}>
                      {emp ? `${emp.name}: ` : ''}{addr}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: c.muted, marginBottom: 28 }}>
              Make sure your wallet is connected, you have PRVT test tokens on devnet, and employees are registered with Umbra.
            </p>
          )}
          <button onClick={reset} style={{
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: 'white', border: 'none', borderRadius: 10,
            padding: '12px 28px', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          }}>
            Try Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}
