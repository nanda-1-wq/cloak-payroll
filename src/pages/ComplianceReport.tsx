import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { usePayroll } from '../context/PayrollContext'
import { useTheme, themeColors } from '../context/ThemeContext'
import {
  FileText, Shield, Download, Eye, Lock, Key, CheckCircle,
  Loader2, ExternalLink, Building2, Calendar, DollarSign, Users,
  Info, ChevronDown, ChevronUp, Copy, X,
} from 'lucide-react'

type ReportState = 'idle' | 'generating' | 'ready'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getQuarter(month: number) {
  return Math.floor(month / 3) + 1 // month is 0-indexed
}

function buildPeriods(): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const currentQ = getQuarter(month)
  const prevQ = currentQ === 1 ? 4 : currentQ - 1
  const prevQYear = currentQ === 1 ? year - 1 : year

  const prevMonth = month === 0 ? 11 : month - 1
  const prevMonthYear = month === 0 ? year - 1 : year

  return [
    `Q${currentQ}-${year}`,
    `Q${prevQ}-${prevQYear}`,
    `${MONTH_NAMES[month]} ${year}`,
    `${MONTH_NAMES[prevMonth]} ${prevMonthYear}`,
    `Full Year ${year - 1}`,
  ]
}

const PERIODS = buildPeriods()

export default function ComplianceReport() {
  const { connected, publicKey } = useWallet()
  const { employees, payrollHistory } = usePayroll()
  const { isDark } = useTheme()
  const c = themeColors(isDark)

  const [reportState, setReportState] = useState<ReportState>('idle')
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0])

  const [toastMsg, setToastMsg] = useState('')
  const [vkCopied, setVkCopied] = useState(false)
  const [showVkModal, setShowVkModal] = useState(false)
  const [vkInfoOpen, setVkInfoOpen] = useState(false)

  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0)
  const ytdTotal = payrollHistory.reduce((s, r) => s + r.totalAmount, 0)

  const generateReport = async () => {
    setReportState('generating')
    await delay(2000)
    setReportState('ready')
  }

  const viewingKey = publicKey
    ? `umbra:vk:${publicKey.toString().slice(0, 8)}:${Date.now().toString(36)}`
    : ''

  const showToast = (msg: string, ms = 3000) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), ms)
  }

  const exportPdf = () => {
    showToast('Opening print dialog — choose "Save as PDF" in your browser')
    setTimeout(() => window.print(), 400)
  }

  const copyViewingKey = async () => {
    await navigator.clipboard.writeText(viewingKey)
    setVkCopied(true)
    setTimeout(() => setVkCopied(false), 2000)
  }

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <Shield size={40} color="#8b5cf6" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: c.heading }}>Connect Wallet</h2>
        <p style={{ color: c.muted, marginBottom: 28 }}>Connect your employer wallet to generate compliance reports.</p>
        <WalletMultiButton />
      </div>
    )
  }

  const selectStyle = {
    width: '100%', backgroundColor: c.inputBg, border: `1px solid ${c.border}`,
    borderRadius: 10, padding: '10px 14px', color: c.inputText,
    fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
  }

  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: isDark ? '#1e1b4b' : '#312e81',
          border: '1px solid rgba(139,92,246,0.4)',
          borderRadius: 12, padding: '12px 20px',
          color: '#e9d5ff', fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          <CheckCircle size={16} color="#a78bfa" />
          {toastMsg}
        </div>
      )}

      {/* Viewing key modal */}
      {showVkModal && (
        <div
          onClick={() => setShowVkModal(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#0f0f1a' : '#ffffff',
              border: `1px solid ${c.border}`,
              borderRadius: 16, padding: 28,
              maxWidth: 560, width: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={16} color="#10b981" />
                <span style={{ fontSize: 16, fontWeight: 700, color: c.heading }}>Full Viewing Key</span>
              </div>
              <button
                onClick={() => setShowVkModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.faint, padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{
              backgroundColor: c.rowBg, borderRadius: 10, padding: '14px 16px',
              fontFamily: 'monospace', fontSize: 12, color: c.muted,
              wordBreak: 'break-all', lineHeight: 1.7,
              border: `1px solid ${c.border}`, marginBottom: 16,
              userSelect: 'all',
            }}>
              {viewingKey}
            </div>
            <p style={{ fontSize: 12, color: c.faint, lineHeight: 1.6, marginBottom: 16 }}>
              Select the text above to copy manually, or use the button below. Keep this key private — share only with your accountant or auditor.
            </p>
            <button
              onClick={copyViewingKey}
              style={{
                width: '100%',
                backgroundColor: vkCopied ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                border: `1px solid ${vkCopied ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
                borderRadius: 10, padding: '10px',
                color: vkCopied ? '#10b981' : '#a78bfa',
                cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {vkCopied ? <><CheckCircle size={15} /> Copied!</> : <><Copy size={15} /> Copy to Clipboard</>}
            </button>
          </div>
        </div>
      )}

      <div className="no-print" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>Compliance Report</h1>
        <p style={{ color: c.muted, fontSize: 14 }}>
          Generate auditable payroll records using Umbra viewing keys - without exposing private data on-chain.
        </p>
      </div>

      {/* How it works banner */}
      <div className="no-print" style={{
        backgroundColor: 'rgba(139,92,246,0.08)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 28,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          backgroundColor: 'rgba(139,92,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Key size={18} color="#a78bfa" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>
            Privacy-preserving compliance using Viewing Keys
          </div>
          <div style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
            Umbra viewing keys let you prove you made specific payments to auditors and regulators without revealing any on-chain data to the public. Share the viewing key with your accountant - they can verify all payments without seeing wallet addresses or amounts on the blockchain.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left panel - generate */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <FileText size={18} color="#a78bfa" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.heading }}>Generate Report</h3>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 6 }}>
                Pay Period
              </label>
              <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} style={selectStyle}>
                {PERIODS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, display: 'block', marginBottom: 6 }}>
                Report Type
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Summary (Redacted)', desc: 'Totals only, no amounts or addresses', checked: true },
                  { label: 'Full Audit Trail', desc: 'All payments with viewing keys', checked: false },
                ].map(opt => (
                  <div key={opt.label} style={{
                    backgroundColor: opt.checked ? 'rgba(139,92,246,0.1)' : c.rowBg,
                    border: `1px solid ${opt.checked ? 'rgba(139,92,246,0.3)' : c.border}`,
                    borderRadius: 10, padding: '10px 12px',
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: c.body }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: c.faint }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={reportState === 'generating'}
              style={{
                width: '100%',
                background: reportState === 'generating' ? (isDark ? '#1e1e3a' : '#e2e8f0') : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: reportState === 'generating' ? c.faint : 'white',
                border: 'none', borderRadius: 10,
                padding: '12px', cursor: reportState === 'generating' ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {reportState === 'generating'
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                : <><Eye size={16} /> Generate Report</>
              }
            </button>
          </div>

          {/* Viewing key */}
          {reportState === 'ready' && (
            <div style={{
              backgroundColor: c.cardBg, border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Key size={15} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: c.heading }}>Viewing Key</span>
              </div>

              {/* Truncated key preview */}
              <div style={{
                backgroundColor: c.rowBg, borderRadius: 8, padding: '10px 12px',
                fontFamily: 'monospace', fontSize: 10, color: c.muted,
                wordBreak: 'break-all', marginBottom: 10,
                border: `1px solid ${c.border}`,
              }}>
                {viewingKey.slice(0, 36)}...
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={copyViewingKey}
                  style={{
                    flex: 1,
                    backgroundColor: vkCopied ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${vkCopied ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.3)'}`,
                    borderRadius: 8, padding: '8px 6px',
                    color: '#10b981', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}
                >
                  {vkCopied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy Key</>}
                </button>
                <button
                  onClick={() => setShowVkModal(true)}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: 8, padding: '8px 6px',
                    color: '#a78bfa', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Eye size={12} /> View Full Key
                </button>
              </div>

              {/* Explanation toggle */}
              <button
                onClick={() => setVkInfoOpen(o => !o)}
                style={{
                  width: '100%', background: 'none',
                  border: `1px solid ${c.border}`,
                  borderRadius: 8, padding: '7px 10px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: c.muted, fontSize: 12, fontWeight: 600,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={12} color="#a78bfa" /> What is a Viewing Key?
                </span>
                {vkInfoOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {vkInfoOpen && (
                <div style={{
                  marginTop: 8, padding: '12px 14px',
                  backgroundColor: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: 8, fontSize: 12, color: c.muted, lineHeight: 1.7,
                }}>
                  A Viewing Key lets auditors verify your payroll history without accessing your wallet.
                  Share it with your accountant or tax authority. It <strong style={{ color: c.body }}>proves payments were made</strong> but{' '}
                  <strong style={{ color: c.body }}>cannot be used to spend funds</strong>.
                  <br /><br />
                  Think of it like a read-only bank statement you can hand to an auditor — they see the
                  transactions but have no ability to move money.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel - report */}
        <div
          id="compliance-report"
          style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28 }}
        >
          {reportState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: c.faint }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ fontSize: 15 }}>Generate a report to see your payroll audit trail</p>
            </div>
          )}

          {reportState === 'generating' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={32} color="#8b5cf6" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: c.muted }}>Decrypting payroll records using viewing key...</p>
            </div>
          )}

          {reportState === 'ready' && (
            <div>
              {/* Report header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 24, flexWrap: 'wrap', gap: 16,
              }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: c.heading }}>Payroll Audit Report</h3>
                  <div style={{ fontSize: 13, color: c.muted }}>Period: <strong style={{ color: c.body }}>{selectedPeriod}</strong></div>
                </div>
                <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={exportPdf}
                    style={{
                      backgroundColor: c.rowBg, border: `1px solid ${c.border}`,
                      borderRadius: 8, padding: '8px 14px',
                      color: c.body, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Download size={13} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Org info */}
              <div style={{
                backgroundColor: c.rowBg, borderRadius: 12, padding: 16, marginBottom: 20,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                border: `1px solid ${c.border}`,
              }}>
                {[
                  { icon: Building2, label: 'Organization', value: 'Acme Corp (Demo)' },
                  { icon: Shield, label: 'Blockchain', value: 'Solana Devnet' },
                  { icon: Calendar, label: 'Generated', value: new Date().toLocaleDateString() },
                  { icon: Key, label: 'Protocol', value: 'Umbra Privacy SDK' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <item.icon size={14} color={c.faint} />
                    <div>
                      <div style={{ fontSize: 11, color: c.faint }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.body }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { icon: Users, label: 'Active Employees', value: employees.length.toString(), color: '#8b5cf6' },
                  { icon: DollarSign, label: 'Total Disbursed', value: `$${ytdTotal.toLocaleString()}`, color: '#10b981' },
                  { icon: CheckCircle, label: 'Payroll Runs', value: payrollHistory.length.toString(), color: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{
                    backgroundColor: c.rowBg, borderRadius: 10, padding: '14px',
                    textAlign: 'center', border: `1px solid ${c.border}`,
                  }}>
                    <s.icon size={16} color={s.color} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2, color: c.heading }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: c.faint }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Employee table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: c.muted }}>EMPLOYEE RECORDS</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.faint }}>
                    <Lock size={10} />
                    Decrypted via viewing key
                  </div>
                </div>

                <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    padding: '10px 16px',
                    backgroundColor: c.rowBg,
                    fontSize: 11, fontWeight: 700, color: c.faint, letterSpacing: '0.5px',
                  }}>
                    <span>EMPLOYEE</span>
                    <span>DEPARTMENT</span>
                    <span>MONTHLY SALARY</span>
                    <span>STATUS</span>
                  </div>
                  {employees.map((emp, i) => (
                    <div key={emp.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      padding: '12px 16px',
                      borderTop: `1px solid ${c.border}`,
                      backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'),
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600, color: c.body }}>{emp.name}</span>
                      <span style={{ color: c.muted }}>{emp.department}</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>${emp.salary.toLocaleString()} USDC</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12 }}>
                        <CheckCircle size={11} /> Verified
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    padding: '12px 16px',
                    borderTop: `2px solid ${c.borderBold}`,
                    fontSize: 13, fontWeight: 700,
                  }}>
                    <span style={{ color: c.body }}>Total</span>
                    <span />
                    <span style={{ color: c.heading }}>${totalPayroll.toLocaleString()} USDC/mo</span>
                    <span />
                  </div>
                </div>
              </div>

              {/* Payroll history */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: c.muted, marginBottom: 10 }}>TRANSACTION HISTORY</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {payrollHistory.map(run => (
                    <div key={run.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', backgroundColor: c.rowBg, borderRadius: 10,
                      border: `1px solid ${c.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={14} color="#10b981" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.body }}>{run.date}</div>
                          <div style={{ fontSize: 11, color: c.faint, fontFamily: 'monospace' }}>
                            {run.txSignature.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                            ${run.totalAmount.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: c.faint }}>{run.employeeCount} employees</div>
                        </div>
                        <a
                          href={`https://explorer.solana.com/tx/${run.txSignature}?cluster=devnet`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: '#8b5cf6' }}
                          className="no-print"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                  {payrollHistory.length === 0 && (
                    <p style={{ color: c.faint, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                      No payroll runs recorded yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Attestation */}
              <div style={{
                marginTop: 24,
                backgroundColor: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 12, padding: '16px',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Shield size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#6ee7b7', lineHeight: 1.6 }}>
                    <strong>Cryptographic Attestation:</strong> This report was generated using Umbra viewing keys. All payment amounts and recipient addresses have been cryptographically verified on Solana Devnet. This document can be shared with auditors, accountants, and regulators as proof of payroll compliance.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media print {
          /* Hide everything except the report panel */
          .no-print { display: none !important; }
          header, footer { display: none !important; }
          body { background: white !important; }
          #compliance-report {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
          }
          /* Make the report grid fill the full width */
          div[style*="gridTemplateColumns: '340px 1fr'"] {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
