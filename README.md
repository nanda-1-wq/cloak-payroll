# CloakPayroll

**Confidential on-chain payroll powered by Cloak SDK on Solana**

> Built for **Superteam Frontier Hackathon — Cloak Track**

---

## Links

| | URL |
|---|---|
| Demo Video | https://youtu.be/1B3E5A3r72o |
| Live Frontend | *(Vercel URL — coming after deploy)* |
| Cloak SDK Docs | https://docs.cloak.ag/sdk/introduction |
| Cloak Website | https://www.cloak.ag |

---

## The Problem

Every salary payment on Solana is permanently public:

- **Amounts are visible** — anyone with a block explorer can read exactly what every employee earns
- **Identities are exposed** — employer and employee wallet addresses are permanently linked on-chain
- **Payment schedules reveal strategy** — pay frequency and amounts expose headcount, burn rate, and company runway to competitors
- **No confidential on-chain payroll exists** — businesses that want the programmability and auditability of blockchain payments must accept full transparency or stay off-chain entirely

---

## The Solution

CloakPayroll wraps the **Cloak SDK** to make on-chain payroll fully private:

- Salary amounts are hidden inside a **Groth16 ZK-proof shielded pool** — no on-chain observer can read the value
- Payments are routed to employees as **shielded UTXO notes** — the link between employer and employee wallets never appears on-chain
- One click triggers a **batch disbursement** that settles all salaries in a single shielded transaction
- Employees can share a **viewing key** with auditors or accountants to prove payment without revealing anything publicly
- The entire flow — deposit, proof generation, relay, withdrawal — runs in the browser with **no server custody** of funds

---

## How It Uses the Cloak SDK

All privacy logic is isolated in [`src/lib/cloak.ts`](src/lib/cloak.ts). The integration exercises the full Cloak SDK stack.

### Client initialization

```ts
import { CloakSDK } from '@cloak.dev/sdk'
import { Connection } from '@solana/web3.js'

const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

const sdk = new CloakSDK({
  wallet: walletAdapter,        // Phantom via Wallet Standard
  network: 'devnet',
  relayUrl: 'https://api.cloak.ag',
})
```

### Batch payroll disbursement — `deposit()` + `privateTransfer()`

Each employee payment deposits into the shielded pool to generate a note, then `privateTransfer()` routes that note to the recipient. Cloak handles ZK proof generation and relay submission internally:

```ts
// Deposit to enter the shielded pool — returns a CloakNote
const depositResult = await sdk.deposit(connection, amountLamports)

// privateTransfer: generates Groth16 proof + submits via relay
const result = await sdk.privateTransfer(connection, depositResult.note, [
  { recipient: new PublicKey(employeeWalletAddress), amount: amountLamports },
])
// result.signature — tx confirmed, amount invisible on-chain
```

Up to 5 recipients can be batched into a single `privateTransfer()` call.

### Employee balance scanning — `loadNotes()`

```ts
// Loads all commitment notes owned by this wallet's Cloak keys
const notes = await sdk.loadNotes()
const totalClaimable = notes.reduce((sum, n) => sum + BigInt(n.amount), 0n)
```

### Salary withdrawal — `withdraw()`

```ts
// Withdraws a note to the employee's public wallet
const result = await sdk.withdraw(connection, note, sdk.getPublicKey())
// result.signature — funds land in the employee's standard wallet
```

### Compliance viewing keys

A viewing key is derived per employer and embedded in every compliance report. Sharing the key with an auditor lets them verify payment amounts and dates on-chain without exposing any public data — matching Cloak's selective-disclosure model.

### Demo Mode flag

```ts
// src/lib/cloak.ts
export const DEMO_MODE = true  // ← flip to false for live devnet transactions
```

When `true`, all SDK calls are replaced with localStorage-backed simulation. The function signatures, types, and call sites are identical in both modes.

---

## Features

| Page | Role | Description |
|---|---|---|
| **Landing** | Public | Product overview, privacy model explainer, how-it-works walkthrough |
| **Dashboard** | Employer | Live stats — headcount, monthly payroll total, run history, last payment date |
| **Employees** | Employer | Add / remove team members with wallet address, salary, and department |
| **Run Payroll** | Employer | One-click batch disbursement with real-time per-employee progress tracking |
| **My Balance** | Employee | Scan shielded pool for incoming notes, view claimable balance, withdraw to wallet |
| **Compliance** | Employer | Generate printable / PDF audit report with viewing-key cryptographic attestation |

---

## Demo Mode

`DEMO_MODE = true` is set in [`src/lib/cloak.ts`](src/lib/cloak.ts). In demo mode:

- All Cloak SDK calls are simulated locally with **realistic delays** that mirror real ZK proof generation (~2 s) and relay round-trips (~1.5 s)
- Balances persist in `localStorage` across the employer and employee pages — run payroll on the employer view, see the balance appear immediately on the employee portal without switching wallets
- Transaction signatures are fake-but-valid-format base58 strings, displayed exactly as they would be on mainnet
- **No real SOL is spent** — no transactions are broadcast to any network

**Switching to live mode:** set `DEMO_MODE = false`. No other code changes are needed.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Privacy protocol | [`@cloak.dev/sdk`](https://docs.cloak.ag) — Groth16 ZK proofs, UTXO shielded pool | 0.1.4 |
| Blockchain | Solana (devnet) | — |
| RPC | `@solana/web3.js` | 1.98 |
| Wallet | Phantom via `@solana/wallet-adapter` (Wallet Standard) | 0.15 |
| Frontend | React 19 + Vite 8 + TypeScript 6 | — |
| Routing | React Router | 7 |
| Node polyfills | `vite-plugin-node-polyfills` — Buffer, crypto, stream for browser ZK | — |
| Icons | Lucide React | — |
| Styling | Inline styles with dark/light theme context | — |
| Package manager | pnpm | — |

---

## Project Structure

```
src/
├── lib/
│   └── cloak.ts              # All Cloak SDK integration — DEMO_MODE flag lives here
├── pages/
│   ├── Landing.tsx            # Marketing / entry page
│   ├── Dashboard.tsx          # Employer overview
│   ├── AddEmployees.tsx       # Employee roster management
│   ├── RunPayroll.tsx         # Batch disbursement flow with per-step progress
│   ├── EmployeeView.tsx       # Employee portal — scan notes + withdraw
│   └── ComplianceReport.tsx   # PDF-ready audit report with viewing key
├── context/
│   ├── PayrollContext.tsx     # Employee list and payroll run history (with mock data)
│   └── ThemeContext.tsx       # Dark / light mode toggle
└── components/
    └── Layout.tsx             # Sticky nav, responsive shell, theme toggle, footer
public/
└── cloak-logo.png             # Official Cloak cat-mask wordmark icon
```

All Cloak SDK calls are isolated in `src/lib/cloak.ts` behind clean async helpers (`initCloakClient`, `sendPrivatePayroll`, `scanForPayroll`, `claimAndWithdraw`). No other file imports from `@cloak.dev/sdk` directly.

---

## Setup

**Prerequisites:** Node.js 18+, pnpm, [Phantom](https://phantom.app) wallet extension set to **devnet**

```bash
# Clone and install
git clone <repo-url>
cd cloak-payroll
pnpm install

# Start dev server
pnpm dev
# → http://localhost:5173

# Production build
pnpm build
```

> The app runs in `DEMO_MODE = true` by default — no devnet SOL needed. To test live transactions, set `DEMO_MODE = false` in `src/lib/cloak.ts` and fund your wallet with devnet SOL (`solana airdrop 2 <address> --url devnet`).

---

## Walkthrough

### Employer flow

1. Connect Phantom (devnet) → **Dashboard**
2. **Employees** → add team members with wallet addresses and salaries
3. **Run Payroll** → review the breakdown → click **Send Private Payroll**
   - In demo mode: each employee's progress animates in real time, fake signatures appear on completion
   - In live mode: ZK proofs are generated in-browser (~3–4 s each), relay submits to devnet
4. **Compliance** → generate a PDF audit report, copy the viewing key for your accountant

### Employee flow

1. Connect Phantom → **My Balance**
2. The portal scans (`loadNotes()`) the shielded pool for notes sent to your wallet
3. Click **Withdraw to Wallet** → funds arrive in your standard Solana wallet

### Demo cross-wallet handoff

With two browser tabs open:
- Tab 1: connect Employer wallet → **Run Payroll** → complete the flow
- Tab 2: connect the same wallet address you added as an employee → **My Balance** → the salary appears instantly (localStorage-backed)

---

## Screenshots

*(Screenshots to be added after final UI polish)*

| Landing | Dashboard | Run Payroll | Employee Portal | Compliance |
|---|---|---|---|---|
| — | — | — | — | — |

---

## License

MIT

---

*CloakPayroll — Superteam Frontier Hackathon 2025, Cloak Track*
