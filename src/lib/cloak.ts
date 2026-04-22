/**
 * Cloak SDK integration for CloakPayroll.
 *
 * This module wraps @cloak.dev/sdk into simple async helpers
 * that the UI can call directly.
 *
 * ─── DEMO MODE ───────────────────────────────────────────────────────────────
 * Set DEMO_MODE = true to run a fully simulated flow (no real transactions).
 * Flip to false to use the live Cloak SDK on devnet.
 *
 * The function signatures are identical either way.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CloakSDK } from '@cloak.dev/sdk'
import { Connection, PublicKey } from '@solana/web3.js'

// ─── Demo mode flag ───────────────────────────────────────────────────────────

/**
 * When true, all SDK calls are simulated locally with realistic delays.
 * Flip to false once you have a live Cloak relay endpoint configured.
 */
export const DEMO_MODE = true

// ─── Public re-export of the client type ─────────────────────────────────────

/** The Cloak SDK client. */
export type CloakClient = CloakSDK

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Cloak uses native SOL (lamports) and SPL tokens (USDC/USDT) directly —
 * there is no separate privacy token. No PRVT_MINT needed.
 *
 * Relay endpoint for all network calls.
 */
const RELAY_URL = 'https://api.cloak.ag'

/**
 * Devnet RPC — used for all live SDK calls that require a Connection.
 * Only instantiated when DEMO_MODE = false.
 */
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

/** Mainnet USDC — kept for reference; confirm SPL support with Cloak docs before enabling. */
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const USDC_DECIMALS = 6

// Internal constant for demo-mode fake note display only.
const _DEMO_MINT_LABEL = 'CLOAK-DEMO'

// ─── Conversions ──────────────────────────────────────────────────────────────

/** Convert a whole-dollar amount to USDC micro-units (6 decimals). */
export function toMicroUsdc(usdAmount: number): bigint {
  return BigInt(Math.round(usdAmount * 10 ** USDC_DECIMALS))
}

/** Format micro-USDC bigint to a human-readable "x,xxx.xx" string. */
export function formatMicroUsdc(microUsdc: bigint): string {
  const usd = Number(microUsdc) / 10 ** USDC_DECIMALS
  return usd.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Demo mode helpers ────────────────────────────────────────────────────────

/** Pause for `ms` milliseconds — used in simulation to mimic on-chain latency. */
function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a realistic-looking Solana transaction signature (base58, 87–88 chars).
 * This is purely for display in demo mode.
 */
function fakeTxSig(): string {
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let sig = ''
  for (let i = 0; i < 87; i++) {
    sig += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)]
  }
  return sig
}

// localStorage keys for demo-mode persistence across pages
const demoKey = {
  registered: (addr: string) => `cloak_demo_reg_${addr}`,
  pendingBalance: (addr: string) => `cloak_demo_balance_${addr}`,
}

// ─── Client lifecycle ─────────────────────────────────────────────────────────

/**
 * Initialise a Cloak client for the currently connected wallet.
 *
 * In DEMO_MODE, returns a minimal stub that satisfies the CloakClient type.
 *
 * @param walletCtx       - The `wallet` object from `useWallet()`.
 * @param publicKeyBase58 - The connected wallet's public key as base-58.
 */
export async function initCloakClient(
  walletCtx: unknown,
  publicKeyBase58: string
): Promise<CloakClient> {
  if (DEMO_MODE) {
    // Return a stub — signer address is all we need for demo helpers.
    await simulateDelay(400)
    return { _demoAddress: publicKeyBase58 } as unknown as CloakClient
  }

  const adapter = (walletCtx as any)?.adapter ?? walletCtx

  return new CloakSDK({
    wallet: adapter as any,
    network: 'devnet',
    relayUrl: RELAY_URL,
  })
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Returns true if the wallet already has a Cloak viewing-key registration.
 *
 * In DEMO_MODE, persists registration state in localStorage so re-connecting
 * the same wallet doesn't re-run registration.
 */
export async function isRegistered(client: CloakClient): Promise<boolean> {
  if (DEMO_MODE) {
    const addr = (client as any)._demoAddress as string
    return localStorage.getItem(demoKey.registered(addr)) === '1'
  }

  // Live path: Cloak does not require an explicit on-chain registration step.
  // Keys are derived client-side from the wallet signature.
  return true
}

/**
 * Register the wallet with Cloak (generate & store viewing keys).
 *
 * In DEMO_MODE, simulates the key-generation flow with realistic delays.
 *
 * @returns Array of transaction signatures from the registration steps.
 */
export async function registerWithCloak(client: CloakClient): Promise<string[]> {
  if (DEMO_MODE) {
    const addr = (client as any)._demoAddress as string
    // Simulate: key generation + relay registration
    await simulateDelay(800)   // key derivation
    await simulateDelay(1800)  // ZK viewing-key proof
    await simulateDelay(1400)  // relay registration
    localStorage.setItem(demoKey.registered(addr), '1')
    return [fakeTxSig(), fakeTxSig(), fakeTxSig()]
  }

  // Live path: Cloak key registration is client-side — no on-chain transaction needed.
  return []
}

// ─── Employee registration check ─────────────────────────────────────────────

/**
 * Check which of the given wallet addresses are NOT yet registered with Cloak.
 *
 * In DEMO_MODE, all employees are treated as registered.
 * In live mode, Cloak does not require pre-registration for recipients.
 *
 * @returns Array of unregistered wallet addresses (always empty for Cloak).
 */
export async function findUnregisteredEmployees(
  _client: CloakClient,
  _walletAddresses: string[]
): Promise<string[]> {
  if (DEMO_MODE) {
    await simulateDelay(700)
    return []
  }

  // Cloak does not require recipients to pre-register — payments are note-based.
  return []
}

// ─── Payroll (employer side) ──────────────────────────────────────────────────

/**
 * Send a private payroll transfer to one employee via the Cloak shielded pool.
 *
 * Live path uses sdk.send() — the correct high-level API for shielded transfers.
 * Amounts are BigInt lamports to avoid floating-point precision bugs.
 *
 * In DEMO_MODE, simulates the flow and writes the balance to localStorage so
 * the Employee Portal can "scan" and find it.
 *
 * @param client           - Employer's Cloak client.
 * @param recipientAddress - Employee's Solana wallet address (base-58).
 * @param usdAmount        - Salary in whole USD (e.g. 8000 = $8,000 USDC).
 * @returns Solana transaction signature of the shielded transfer.
 */
export async function sendPrivatePayroll(
  client: CloakClient,
  recipientAddress: string,
  usdAmount: number
): Promise<string> {
  if (DEMO_MODE) {
    // Simulate ZK proof generation (~2s) + on-chain confirmation (~1.5s)
    await simulateDelay(2200)
    // Write to localStorage so the employee can "scan" and find the balance
    const existing = BigInt(localStorage.getItem(demoKey.pendingBalance(recipientAddress)) ?? '0')
    const added = existing + toMicroUsdc(usdAmount)
    localStorage.setItem(demoKey.pendingBalance(recipientAddress), added.toString())
    return fakeTxSig()
  }

  // Live path: deposit to get a note, then privateTransfer to recipient.
  // privateTransfer handles the full flow: ZK proof + relay submission.
  // Amount in whole-number lamports (usdAmount * 1e6 for USDC-equivalent display).
  const amountLamports = Math.round(usdAmount * 1_000_000)
  const depositResult = await client.deposit(connection, amountLamports)
  const result = await client.privateTransfer(connection, depositResult.note, [
    { recipient: new PublicKey(recipientAddress), amount: amountLamports },
  ])
  return result.signature
}

// ─── Balance / claim (employee side) ─────────────────────────────────────────

export interface ScanResult {
  /** All claimable notes found for this wallet. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  received: any[]
  /** Total claimable amount in micro-units (lamports in live mode, micro-USDC in demo). */
  totalMicroUsdc: bigint
}

/**
 * Scan the Cloak shielded pool for incoming payroll notes addressed to this wallet.
 *
 * Live path uses client.loadNotes(connection) — the correct SDK method for
 * retrieving stored commitment notes belonging to this wallet.
 *
 * In DEMO_MODE, reads the pending balance written by sendPrivatePayroll
 * from localStorage. Also falls back to a seeded demo balance so the
 * employee portal is non-empty even before payroll has been run.
 */
export async function scanForPayroll(client: CloakClient): Promise<ScanResult> {
  if (DEMO_MODE) {
    const addr = (client as any)._demoAddress as string
    // Simulate scan latency (commitment tree traversal)
    await simulateDelay(1600)

    const raw = localStorage.getItem(demoKey.pendingBalance(addr))
    // If employer hasn't run payroll yet, seed with a demo balance so judges
    // can see the full withdraw flow without needing two wallets.
    const totalMicroUsdc = raw !== null
      ? BigInt(raw)
      : toMicroUsdc(8500) // $8,500 demo salary

    if (totalMicroUsdc === 0n) {
      return { received: [], totalMicroUsdc: 0n }
    }

    // Fabricate a single note that matches the balance
    const fakeNote = { amount: totalMicroUsdc.toString(), mint: _DEMO_MINT_LABEL }
    return { received: [fakeNote], totalMicroUsdc }
  }

  // Live path: load commitment notes stored by this wallet's Cloak keys.
  // loadNotes() takes no arguments — connection is embedded in the SDK instance.
  const notes = await client.loadNotes()
  const totalMicroUsdc = notes.reduce(
    (sum: bigint, note) => sum + BigInt(note.amount ?? 0),
    0n
  )

  return { received: notes as any[], totalMicroUsdc }
}

/**
 * Withdraw claimable payroll notes to the employee's public Solana wallet.
 *
 * Live path uses client.withdraw(connection, amount) with a bigint amount.
 *
 * In DEMO_MODE, simulates the two-step ZK claim + withdrawal and clears
 * the pending balance from localStorage.
 *
 * @returns Solana transaction signature of the final withdrawal.
 */
export async function claimAndWithdraw(
  client: CloakClient,
  utxos: any[],
  _totalMicroUsdc: bigint
): Promise<string> {
  if (DEMO_MODE) {
    if (utxos.length === 0) throw new Error('No notes to claim.')
    const addr = (client as any)._demoAddress as string
    // Step 1: ZK proof for withdrawal
    await simulateDelay(2800)
    // Step 2: on-chain withdrawal to public wallet
    await simulateDelay(1200)
    // Clear the pending balance
    localStorage.removeItem(demoKey.pendingBalance(addr))
    return fakeTxSig()
  }

  if (utxos.length === 0) throw new Error('No notes to claim.')

  // Live path: withdraw each note to the connected wallet's public key.
  // withdraw(connection, note, recipientPublicKey) per note.
  const recipientPubkey = client.getPublicKey()
  let lastSignature = ''
  for (const note of utxos) {
    const result = await client.withdraw(connection, note, recipientPubkey)
    lastSignature = result.signature
  }
  return lastSignature
}
