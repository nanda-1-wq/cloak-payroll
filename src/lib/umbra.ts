/**
 * Umbra SDK integration for Private Payroll.
 *
 * This module wraps @umbra-privacy/sdk into simple async helpers
 * that the UI can call directly.
 *
 * ─── DEMO MODE ───────────────────────────────────────────────────────────────
 * Set DEMO_MODE = true to run a fully simulated flow (no real transactions).
 * This is required while Umbra's devnet Arcium MPC pools are inactive
 * (active_stealth_pool_indices: [] from /v1/relayer/info).
 *
 * To switch to live SDK: set DEMO_MODE = false.
 * The function signatures are identical either way.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  getUmbraClient,
  getUmbraRelayer,
  getUserRegistrationFunction,
  getUserAccountQuerierFunction,
  getClaimableUtxoScannerFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  createSignerFromWalletAccount,
} from '@umbra-privacy/sdk'
import {
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getUserRegistrationProver,
} from '@umbra-privacy/web-zk-prover'
import type { Wallet, WalletAccount } from '@wallet-standard/core'
import { PublicKey } from '@solana/web3.js'

// ─── Demo mode flag ───────────────────────────────────────────────────────────

/**
 * When true, all SDK calls are simulated locally with realistic delays.
 * Flip to false once Umbra's devnet Arcium MPC pools are active.
 *
 * Root cause of devnet reverts: active_stealth_pool_indices: [] — the
 * Arcium confidential computing pools required for ZK proof submission
 * are not yet initialized on this devnet deployment.
 */
export const DEMO_MODE = true

// ─── Public re-export of the client type ─────────────────────────────────────

/** The resolved Umbra client type (IUmbraClient is not exported from the SDK). */
export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Umbra's PRVT test token on devnet.
 *
 * Umbra relayer supported mints (from /v1/relayer/info):
 *   EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  ← mainnet USDC (used by Umbra on devnet too)
 *   PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta   ← Umbra PRVT test token
 *   So11111111111111111111111111111111111111112      ← wSOL
 *   Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB  ← USDT
 *
 * Circle's standard devnet USDC (4zMMC9...) is NOT in this list.
 */
export const PRVT_MINT_DEVNET = 'PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta'
/** Mainnet USDC address — also used by Umbra on devnet. */
export const USDC_MINT_DEVNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const USDC_DECIMALS = 6

const RPC_URL = 'https://api.devnet.solana.com'
const RPC_WS_URL = 'wss://api.devnet.solana.com'
const INDEXER_URL = 'https://utxo-indexer.api.umbraprivacy.com'
const RELAYER_URL = 'https://relayer.api.umbraprivacy.com'

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
  // Solana sigs are 64 bytes → ~87-88 base58 chars
  for (let i = 0; i < 87; i++) {
    sig += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)]
  }
  return sig
}

// localStorage keys for demo-mode persistence across pages
const demoKey = {
  registered: (addr: string) => `umbra_demo_reg_${addr}`,
  pendingBalance: (addr: string) => `umbra_demo_balance_${addr}`,
}

// ─── Wallet Standard bridge ───────────────────────────────────────────────────

/**
 * Extract the Wallet Standard Wallet + WalletAccount from the wallet adapter
 * context object returned by `useWallet()`.
 */
function extractWalletStandardAccount(
  walletCtx: unknown,
  publicKeyBase58: string
): { wallet: Wallet; account: WalletAccount } {
  const adapter = (walletCtx as any)?.adapter
  const standardWallet = adapter?.wallet as Wallet | undefined

  if (
    !standardWallet ||
    typeof standardWallet !== 'object' ||
    !Array.isArray(standardWallet.accounts)
  ) {
    throw new Error(
      'Your wallet does not support the Wallet Standard. ' +
        'Please use Phantom, Backpack, or Solflare.'
    )
  }

  const account = standardWallet.accounts.find((a: WalletAccount) => {
    try {
      return new PublicKey(a.publicKey).toBase58() === publicKeyBase58
    } catch {
      return false
    }
  })

  if (!account) {
    throw new Error(
      `No connected account found for ${publicKeyBase58}. ` +
        'Make sure your wallet is connected and unlocked.'
    )
  }

  return { wallet: standardWallet, account }
}

// ─── Client lifecycle ─────────────────────────────────────────────────────────

/**
 * Initialise an Umbra client for the currently connected wallet.
 *
 * In DEMO_MODE, returns a minimal stub containing only the fields our helpers
 * actually access (signer.address). The stub is cast to UmbraClient so the
 * rest of the codebase is type-safe without changes.
 *
 * @param walletCtx       - The `wallet` object from `useWallet()`.
 * @param publicKeyBase58 - The connected wallet's public key as base-58.
 */
export async function initUmbraClient(
  walletCtx: unknown,
  publicKeyBase58: string
): Promise<UmbraClient> {
  if (DEMO_MODE) {
    // Return a minimal stub. Only signer.address is used by our helper functions.
    await simulateDelay(400)
    return { signer: { address: publicKeyBase58 } } as unknown as UmbraClient
  }

  const { wallet, account } = extractWalletStandardAccount(walletCtx, publicKeyBase58)
  const signer = createSignerFromWalletAccount(wallet, account)

  return getUmbraClient({
    signer,
    network: 'devnet',
    rpcUrl: RPC_URL,
    rpcSubscriptionsUrl: RPC_WS_URL,
    indexerApiEndpoint: INDEXER_URL,
    deferMasterSeedSignature: true,
  })
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Returns true if the wallet already has an on-chain Umbra user account.
 *
 * In DEMO_MODE, persists registration state in localStorage so re-connecting
 * the same wallet doesn't re-run registration.
 */
export async function isRegistered(client: UmbraClient): Promise<boolean> {
  if (DEMO_MODE) {
    const addr = (client as any).signer.address as string
    return localStorage.getItem(demoKey.registered(addr)) === '1'
  }

  try {
    const query = getUserAccountQuerierFunction({ client })
    const result = await query(client.signer.address)
    return result.state === 'exists'
  } catch {
    return false
  }
}

/**
 * Register the wallet with Umbra (confidential + anonymous modes).
 *
 * In DEMO_MODE, simulates the three-transaction registration flow with
 * realistic delays (ZK proof generation + Arcium MPC round-trip).
 *
 * @returns Array of transaction signatures from the registration steps.
 */
export async function registerWithUmbra(client: UmbraClient): Promise<string[]> {
  if (DEMO_MODE) {
    const addr = (client as any).signer.address as string
    // Simulate: init account tx (fast) + X25519 key registration (ZK) + anonymous commitment (ZK)
    await simulateDelay(800)   // account init
    await simulateDelay(1800)  // ZK proof for confidential registration
    await simulateDelay(1400)  // ZK proof for anonymous registration
    localStorage.setItem(demoKey.registered(addr), '1')
    return [fakeTxSig(), fakeTxSig(), fakeTxSig()]
  }

  const zkProver = getUserRegistrationProver()
  const register = getUserRegistrationFunction({ client }, { zkProver })
  return register({ confidential: true, anonymous: true })
}

// ─── Employee registration check ─────────────────────────────────────────────

/**
 * Check which of the given wallet addresses are NOT yet registered with Umbra.
 *
 * In DEMO_MODE, all employees are treated as registered (their wallets are
 * assumed to have visited the Employee Portal first).
 *
 * @returns Array of unregistered wallet addresses (empty = all good).
 */
export async function findUnregisteredEmployees(
  client: UmbraClient,
  walletAddresses: string[]
): Promise<string[]> {
  if (DEMO_MODE) {
    await simulateDelay(700)
    // In demo, treat all employees as registered
    return []
  }

  const query = getUserAccountQuerierFunction({ client })

  const results = await Promise.allSettled(
    walletAddresses.map(async (addr) => {
      try {
        const result = await query(addr as any)
        return result.state === 'exists' ? null : addr
      } catch {
        return addr
      }
    })
  )

  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((addr): addr is string => addr !== null)
}

// ─── Payroll (employer side) ──────────────────────────────────────────────────

/**
 * Send a single private payroll transfer to one employee.
 *
 * Creates a receiver-claimable UTXO in the Umbra mixer pool. Only the
 * employee can claim it; the amount is invisible on-chain.
 *
 * In DEMO_MODE, simulates the ZK proof + deposit and writes the amount to
 * localStorage so the Employee Portal can "scan" and find it.
 *
 * @param client           - Employer's Umbra client.
 * @param recipientAddress - Employee's Solana wallet address.
 * @param usdAmount        - Salary in whole USD (e.g. 8000 = $8,000 USDC).
 * @param mint             - Token mint (defaults to Umbra PRVT test token).
 * @returns Solana transaction signature of the mixer deposit.
 */
export async function sendPrivatePayroll(
  client: UmbraClient,
  recipientAddress: string,
  usdAmount: number,
  mint: string = PRVT_MINT_DEVNET
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

  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver()
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver }
  )

  const result = await createUtxo({
    amount: toMicroUsdc(usdAmount) as any,
    destinationAddress: recipientAddress as any,
    mint: mint as any,
  })

  return result.createUtxoSignature
}

// ─── Balance / claim (employee side) ─────────────────────────────────────────

export interface ScanResult {
  /** All receiver-claimable UTXOs found for this wallet (raw SDK data). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  received: any[]
  /** Total claimable amount in micro-USDC (sum of UTXO amounts). */
  totalMicroUsdc: bigint
}

/**
 * Scan the Umbra mixer pool for incoming payroll UTXOs addressed to this wallet.
 *
 * In DEMO_MODE, reads the pending balance written by sendPrivatePayroll
 * from localStorage. Also falls back to a seeded demo balance so the
 * employee portal is non-empty even before payroll has been run.
 */
export async function scanForPayroll(client: UmbraClient): Promise<ScanResult> {
  if (DEMO_MODE) {
    const addr = (client as any).signer.address as string
    // Simulate scan latency (merkle tree traversal)
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

    // Fabricate a single UTXO that matches the balance
    const fakeUtxo = { amount: totalMicroUsdc.toString(), mint: PRVT_MINT_DEVNET }
    return { received: [fakeUtxo], totalMicroUsdc }
  }

  const scan = getClaimableUtxoScannerFunction({ client })
  const result = await scan(0 as any, 0 as any)

  const received: any[] = result.received
  const totalMicroUsdc = received.reduce(
    (sum: bigint, utxo: any) => sum + BigInt(utxo.amount),
    0n
  )

  return { received, totalMicroUsdc }
}

/**
 * Claim received payroll UTXOs into the employee's encrypted balance,
 * then withdraw the full amount to their public Solana wallet.
 *
 * In DEMO_MODE, simulates the two-step ZK claim + withdrawal and clears
 * the pending balance from localStorage.
 *
 * @returns Solana transaction signature of the final withdrawal.
 */
export async function claimAndWithdraw(
  client: UmbraClient,
  utxos: any[],
  totalMicroUsdc: bigint,
  mint: string = PRVT_MINT_DEVNET
): Promise<string> {
  if (DEMO_MODE) {
    if (utxos.length === 0) throw new Error('No UTXOs to claim.')
    const addr = (client as any).signer.address as string
    // Step 1: ZK claim into encrypted balance (Arcium MPC round-trip)
    await simulateDelay(2800)
    // Step 2: withdraw encrypted balance → public ATA
    await simulateDelay(1200)
    // Clear the pending balance
    localStorage.removeItem(demoKey.pendingBalance(addr))
    return fakeTxSig()
  }

  if (utxos.length === 0) throw new Error('No UTXOs to claim.')

  if (!client.fetchBatchMerkleProof) {
    throw new Error(
      'Indexer not configured on Umbra client — cannot fetch Merkle proofs. ' +
        'Make sure INDEXER_URL is set.'
    )
  }

  const relayer = getUmbraRelayer({ apiEndpoint: RELAYER_URL })

  // Step 1 — Claim UTXOs into encrypted balance
  const claimProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver()
  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    {
      zkProver: claimProver,
      fetchBatchMerkleProof: client.fetchBatchMerkleProof,
      relayer,
    }
  )
  await claim(utxos)

  // Step 2 — Withdraw encrypted balance → public ATA
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client })
  const withdrawResult = await withdraw(
    client.signer.address,
    mint as any,
    totalMicroUsdc as any
  )

  return withdrawResult.callbackSignature ?? withdrawResult.queueSignature
}
