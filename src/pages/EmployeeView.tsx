import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  Eye, Lock, ArrowDownToLine, CheckCircle, Loader2,
  Shield, ExternalLink, RefreshCw, Clock, DollarSign, UserPlus,
} from 'lucide-react'
import { useTheme, themeColors } from '../context/ThemeContext'
import {
  initUmbraClient,
  isRegistered,
  registerWithUmbra,
  scanForPayroll,
  claimAndWithdraw,
  formatMicroUsdc,
  DEMO_MODE,
  type ScanResult,
  type UmbraClient,
} from '../lib/umbra'

type LoadState = 'idle' | 'registering' | 'scanning' | 'ready' | 'error'
type WithdrawState = 'idle' | 'generating' | 'confirming' | 'processing' | 'done'

export default function EmployeeView() {
  const { connected, publicKey, wallet } = useWallet()
  const { isDark } = useTheme()
  const c = themeColors(isDark)

  const [client, setClient] = useState<UmbraClient | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loadError, setLoadError] = useState('')

  const [withdrawState, setWithdrawState] = useState<WithdrawState>('idle')
  const [withdrawTx, setWithdrawTx] = useState('')
  const [withdrawError, setWithdrawError] = useState('')

  const initAndScan = useCallback(async () => {
    if (!publicKey || !wallet) return
    setLoadState('idle')
    setLoadError('')
    setScanResult(null)
    setClient(null)

    try {
      const cl = await initUmbraClient(wallet, publicKey.toBase58())

      const registered = await isRegistered(cl)
      if (!registered) {
        setLoadState('registering')
        await registerWithUmbra(cl)
      }

      setClient(cl)

      setLoadState('scanning')
      const result = await scanForPayroll(cl)
      setScanResult(result)
      setLoadState('ready')
    } catch (err: unknown) {
      console.error('Employee view init failed:', err)
      setLoadError(err instanceof Error ? err.message : String(err))
      setLoadState('error')
    }
  }, [publicKey, wallet])

  useEffect(() => {
    if (connected && publicKey && wallet) {
      initAndScan()
    }
  }, [connected, publicKey?.toBase58()]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWithdraw = async () => {
    if (!client || !scanResult || scanResult.received.length === 0) return
    setWithdrawError('')
    setWithdrawState('generating')

    try {
      setWithdrawState('confirming')
      setWithdrawState('processing')

      const sig = await claimAndWithdraw(
        client,
        scanResult.received,
        scanResult.totalMicroUsdc
      )

      setWithdrawTx(sig)
      setScanResult({ received: [], totalMicroUsdc: 0n })
      setWithdrawState('done')
    } catch (err: unknown) {
      console.error('Withdraw failed:', err)
      setWithdrawError(err instanceof Error ? err.message : String(err))
      setWithdrawState('idle')
    }
  }

  // Not connected
  if (!connected) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '80px 24px' }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <Eye size={36} color="#a78bfa" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12, color: c.heading }}>
          Employee Portal
        </h1>
        <p style={{ color: c.muted, fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
          Connect your wallet to view your encrypted salary balance. Only you can see your own payment.
        </p>
        <WalletMultiButton />
        <div style={{
          marginTop: 40,
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 12, padding: 20, textAlign: 'left',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.muted, marginBottom: 12 }}>
            HOW YOUR PRIVACY IS PROTECTED
          </div>
          {[
            { icon: Lock, text: 'Your salary amount is encrypted - not visible on the blockchain' },
            { icon: Shield, text: 'Payments come to a stealth address only you can claim' },
            { icon: Eye, text: 'Only you see your balance when you scan with your private key' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
              <item.icon size={14} color="#8b5cf6" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: c.muted }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Loading / registering / scanning
  if (loadState !== 'ready' && loadState !== 'error') {
    const messages: Record<string, string> = {
      idle: 'Initialising Umbra client...',
      registering: 'Registering with Umbra privacy protocol...',
      scanning: 'Scanning stealth addresses for your payments...',
    }
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>My Salary</h1>
          <p style={{ color: c.muted, fontSize: 14 }}>
            Wallet{' '}
            <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
              {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}
            </span>
          </p>
        </div>
        <div style={{
          backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
          borderRadius: 16, padding: 48, textAlign: 'center',
        }}>
          {loadState === 'registering' ? (
            <UserPlus size={36} color="#a78bfa" style={{ margin: '0 auto 20px' }} />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Loader2 size={28} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          <p style={{ color: c.muted, fontSize: 15 }}>
            {messages[loadState] ?? 'Loading...'}
          </p>
          {loadState === 'registering' && (
            <p style={{ color: c.faint, fontSize: 13, marginTop: 8 }}>
              Approve the signing prompt in Phantom to continue.
            </p>
          )}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Error state
  if (loadState === 'error') {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>My Salary</h1>
        </div>
        <div style={{
          backgroundColor: c.cardBg, border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, padding: 36, textAlign: 'center',
        }}>
          <p style={{ color: '#f87171', fontSize: 15, marginBottom: 16 }}>Failed to load balance</p>
          {loadError && (
            <div style={{
              backgroundColor: c.rowBg, borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: c.muted, fontFamily: 'monospace',
              wordBreak: 'break-word', textAlign: 'left', marginBottom: 20,
              border: `1px solid ${c.border}`,
            }}>
              {loadError}
            </div>
          )}
          <button onClick={initAndScan} style={{
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: 'white', border: 'none', borderRadius: 10,
            padding: '10px 24px', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    )
  }

  // Ready - show balance
  const balanceDisplay = scanResult
    ? `$${formatMicroUsdc(scanResult.totalMicroUsdc)}`
    : '$0.00'
  const hasBalance = (scanResult?.totalMicroUsdc ?? 0n) > 0n
  const isWithdrawn = withdrawState === 'done'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: c.heading }}>My Salary</h1>
        <p style={{ color: c.muted, fontSize: 14 }}>
          Scanning stealth addresses for wallet{' '}
          <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
            {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}
          </span>
        </p>
      </div>

      {/* Demo mode banner */}
      {DEMO_MODE && (
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 15 }}>🎬</span>
          <span style={{ fontSize: 13, color: '#fbbf24' }}>
            <strong>Demo mode</strong> - balance and transactions are simulated. Real ZK proofs run in production.
          </span>
        </div>
      )}

      {/* Privacy badge */}
      <div style={{
        backgroundColor: 'rgba(139,92,246,0.08)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 12, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24,
      }}>
        <Lock size={14} color="#a78bfa" />
        <span style={{ fontSize: 13, color: '#c4b5fd' }}>
          This balance is encrypted on-chain. Only your wallet can decrypt it.
        </span>
      </div>

      {/* Balance card — always uses a solid dark gradient so white text is legible in both themes */}
      <div style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.15))'
          : 'linear-gradient(135deg, #4c1d95, #164e63)',
        border: '1px solid rgba(139,92,246,0.4)',
        borderRadius: 20, padding: '40px 32px', textAlign: 'center',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(124,58,237,0.25), transparent)',
          borderRadius: '50%',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', color: 'rgba(196,181,253,0.8)', marginBottom: 12 }}>
            ENCRYPTED BALANCE
          </div>

          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-2px', marginBottom: 4 }}>
            {isWithdrawn ? (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>$0.00</span>
            ) : (
              <span style={{ color: '#ffffff' }}>
                {balanceDisplay}
                <span style={{ fontSize: 20, color: 'rgba(196,181,253,0.8)', fontWeight: 500 }}> USDC</span>
              </span>
            )}
          </div>

          <div style={{ fontSize: 14, color: 'rgba(196,181,253,0.7)', marginBottom: 28 }}>
            {scanResult?.received.length ?? 0} claimable UTXO{(scanResult?.received.length ?? 0) !== 1 ? 's' : ''} found
          </div>

          {withdrawState === 'idle' && !isWithdrawn && (
            <button
              onClick={handleWithdraw}
              disabled={!hasBalance}
              style={{
                background: hasBalance
                  ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                  : 'rgba(255,255,255,0.12)',
                color: hasBalance ? 'white' : 'rgba(196,181,253,0.6)',
                border: 'none', borderRadius: 12,
                padding: '14px 36px', cursor: hasBalance ? 'pointer' : 'not-allowed',
                fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '0 auto',
                boxShadow: hasBalance ? '0 0 40px rgba(124,58,237,0.35)' : 'none',
              }}
            >
              <ArrowDownToLine size={18} />
              {hasBalance ? 'Withdraw to Wallet' : 'No balance to withdraw'}
            </button>
          )}

          {withdrawState === 'generating' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#a78bfa' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Generating ZK proof for withdrawal...</span>
            </div>
          )}

          {withdrawState === 'confirming' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fbbf24' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Confirm in Phantom wallet...</span>
            </div>
          )}

          {withdrawState === 'processing' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#06b6d4' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Broadcasting to Solana...</span>
            </div>
          )}

          {withdrawState === 'done' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#10b981', marginBottom: 12 }}>
                <CheckCircle size={18} />
                <span style={{ fontWeight: 700 }}>Successfully withdrawn!</span>
              </div>
              {DEMO_MODE ? (
                <div style={{ fontSize: 12, color: '#fbbf24', textAlign: 'center' }}>
                  Simulated tx: {withdrawTx?.slice(0, 20)}...
                </div>
              ) : (
                <a
                  href={`https://explorer.solana.com/tx/${withdrawTx}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: '#8b5cf6', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <ExternalLink size={12} />
                  View on Solana Explorer
                </a>
              )}
            </div>
          )}

          {withdrawError && (
            <div style={{
              marginTop: 16,
              backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8,
              padding: '8px 12px', fontSize: 12, color: '#f87171',
              fontFamily: 'monospace', wordBreak: 'break-word', textAlign: 'left',
            }}>
              {withdrawError}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { icon: DollarSign, label: 'Available Balance', value: isWithdrawn ? '$0.00' : balanceDisplay, color: '#8b5cf6' },
          { icon: CheckCircle, label: 'Claimable UTXOs', value: String(isWithdrawn ? 0 : (scanResult?.received.length ?? 0)), color: '#10b981' },
          { icon: Clock, label: 'Last Scan', value: 'Just now', color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: c.cardBg, border: `1px solid ${c.border}`,
            borderRadius: 12, padding: '16px', textAlign: 'center',
          }}>
            <s.icon size={18} color={s.color} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: c.heading, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: c.faint }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rescan panel */}
      <div style={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: c.heading }}>Scan Status</h3>
          <button
            onClick={initAndScan}
            style={{
              background: 'none', border: `1px solid ${c.border}`, borderRadius: 8,
              padding: '6px 10px', color: c.muted, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            }}
          >
            <RefreshCw size={12} /> Re-scan
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: c.muted }}>Stealth pool tree scanned</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Tree 0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: c.muted }}>UTXOs found</span>
            <span style={{ color: c.body, fontWeight: 600 }}>{scanResult?.received.length ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: c.muted }}>Total claimable</span>
            <span style={{ color: c.body, fontWeight: 600 }}>
              {isWithdrawn ? '$0.00' : balanceDisplay} USDC
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
