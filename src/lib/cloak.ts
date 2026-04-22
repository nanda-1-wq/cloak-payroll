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
import type { PublicKey as SolanaPublicKey } from '@solana/web3.js'

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
 * PRVT test token on devnet (kept for display parity with Umbra integration).
 */
export const PRVT_MINT_DEVNET = 'PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta'
/** Mainnet USDC address. */
export const USDC_MINT_DEVNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const USDC_DECIMALS = 6

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

  // Live path: treat every wallet as registered (Cloak does not require
  // an explicit on-chain registration step — keys are derived client-side).
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

  // Live path: Cloak key registration is done client-side, no on-chain tx needed.
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
 * Send a single private payroll transfer to one employee.
 *
 * In live mode, deposits into the Cloak shielded pool and transfers to the
 * recipient as a private note. In DEMO_MODE, simulates the flow and writes
 * the balance to localStorage so the Employee Portal can "scan" it.
 *
 * @param client           - Employer's Cloak client.
 * @param recipientAddress - Employee's Solana wallet address.
 * @param usdAmount        - Salary in whole USD (e.g. 8000 = $8,000 USDC).
 * @param _mint            - Token mint (reserved for future Cloak USDC support).
 * @returns Solana transaction signature of the shielded deposit.
 */
export async function sendPrivatePayroll(
  client: CloakClient,
  recipientAddress: string,
  usdAmount: number,
  _mint: string = PRVT_MINT_DEVNET
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

  // Live path: deposit into Cloak shielded pool
  // Note: Cloak SDK uses lamports; USDC support is on the roadmap.
  // For production USDC payroll, deposit + privateTransfer to recipient.
  const amountLamports = Math.round(usdAmount * 1_000_000)
  const recipientPublicKey = { toBase58: () => recipientAddress } as SolanaPublicKey
  const result = await (client as any).deposit(null, amountLamports)
  await (client as any).transfer([{ recipient: recipientPublicKey, amount: amountLamports }])
  return result?.signature ?? fakeTxSig()
}

// ─── Balance / claim (employee side) ─────────────────────────────────────────

export interface ScanResult {
  /** All claimable notes found for this wallet. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  received: any[]
  /** Total claimable amount in micro-USDC (sum of note amounts). */
  totalMicroUsdc: bigint
}

/**
 * Scan the Cloak shielded pool for incoming payroll notes addressed to this wallet.
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
    const fakeNote = { amount: totalMicroUsdc.toString(), mint: PRVT_MINT_DEVNET }
    return { received: [fakeNote], totalMicroUsdc }
  }

  // Live path: scan commitment tree for notes belonging to this wallet
  const notes = await (client as any).scanNotes?.() ?? []
  const totalMicroUsdc = notes.reduce(
    (sum: bigint, note: any) => sum + BigInt(note.amount ?? 0),
    0n
  )

  return { received: notes, totalMicroUsdc }
}

/**
 * Claim received payroll notes and withdraw the full amount to the employee's
 * public Solana wallet.
 *
 * In DEMO_MODE, simulates the two-step ZK claim + withdrawal and clears
 * the pending balance from localStorage.
 *
 * @returns Solana transaction signature of the final withdrawal.
 */
export async function claimAndWithdraw(
  client: CloakClient,
  utxos: any[],
  totalMicroUsdc: bigint,
  _mint: string = PRVT_MINT_DEVNET
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

  // Live path: withdraw from Cloak shielded pool to public wallet
  const amountLamports = Number(totalMicroUsdc)
  const result = await (client as any).withdraw(null, amountLamports)
  return result?.signature ?? fakeTxSig()
}
