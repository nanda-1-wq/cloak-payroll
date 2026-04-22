# PrivatePayroll

**Confidential on-chain payroll powered by Umbra's stealth address protocol on Solana.**

> Built for [Superteam Frontier Hackathon](https://superteam.fun)
## Demo Video
[Watch on YouTube](https://youtu.be/1B3E5A3r72o)
---

## The Problem

Traditional on-chain payroll is a privacy disaster. Every salary transfer is permanently visible on the blockchain, anyone with a wallet address can see exactly how much every employee earns, when they get paid, and who the employer is. This exposes companies to competitive intelligence leaks, exposes employees to personal security risks, and creates compliance headaches when confidential compensation data becomes permanently public.

Off-chain payroll solves privacy but loses the auditability, programmability, and trust guarantees that blockchains provide. Companies shouldn't have to choose between the two.

**PrivatePayroll solves this.** It brings the programmability and auditability of on-chain payroll together with cryptographic privacy, salary amounts are encrypted inside ZK proofs, recipient addresses are ephemeral stealth addresses, and employers can still generate cryptographically-verified compliance reports for auditors using Umbra viewing keys.

### Target Users

| User | Pain Point | Solution |
|------|-----------|----------|
| **Startups & DAOs** | Token compensation is publicly visible, exposing equity structures | Encrypted USDC payroll with no on-chain amount leakage |
| **Remote-first companies** | Cross-border payroll on public chains exposes staff salaries globally | Stealth address delivery — sender and recipient wallets are never linked |
| **Finance & Legal teams** | Need audit trails without publishing raw blockchain data | Viewing key compliance reports shareable with accountants and regulators |
| **Employees** | Salary visibility and personal security concerns | Claim salary privately; only you can decrypt your own balance |

---

## How It Uses the Umbra SDK

PrivatePayroll is built directly on top of [`@umbra-privacy/sdk`](https://www.npmjs.com/package/@umbra-privacy/sdk) v4 and [`@umbra-privacy/web-zk-prover`](https://www.npmjs.com/package/@umbra-privacy/web-zk-prover) v2. Every layer of Umbra's privacy stack is exercised.

### 1. Encrypted Transfer Amounts (ETAs)

When an employer runs payroll, each payment is submitted as an **Encrypted Transfer Amount** - the USDC value is committed inside a ZK proof so no on-chain observer can read the salary amount, only that a deposit occurred. The app uses the browser-side ZK prover to generate this proof client-side before submission:

```ts
const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver()
const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
  { client },
  { zkProver }
)
await createUtxo({
  amount: toMicroUsdc(usdAmount),        // encrypted in the proof
  destinationAddress: recipientAddress,  // stealth — not the employee's real wallet
  mint: PRVT_MINT_DEVNET,
})
```

### 2. Mixer Pool (Receiver-Claimable UTXOs)

Payments are deposited into Umbra's confidential **mixer pool** as receiver-claimable UTXOs. This breaks the on-chain link between sender and recipient — the employer's wallet and the employee's wallet are never directly associated in any transaction. The UTXO sits encrypted in the pool until the correct employee scans and claims it.

**Umbra Program ID on Solana Devnet:**
```
DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ
```

**Token mint — Umbra PRVT test token (devnet):**
```
PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta
```

### 3. Stealth Address Scanning

Employees connect their wallet to the Employee Portal and scan the Umbra Merkle tree for UTXOs addressed to their key. The scanner traverses the on-chain tree and decrypts only the records that belong to the connected wallet — no one else can see them:

```ts
const scan = getClaimableUtxoScannerFunction({ client })
const result = await scan(0, 0)
// result.received → UTXOs belonging to this wallet only
```

### 4. ZK Claim & Withdrawal

Withdrawing is a two-step ZK flow. First the employee generates a proof claiming their UTXOs into Umbra's Arcium MPC-backed encrypted balance. Then a second proof withdraws that balance to their standard Solana token account:

```ts
// Step 1 — claim UTXO into encrypted balance (Arcium MPC round-trip)
const claimProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver()
const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
  { client },
  { zkProver: claimProver, fetchBatchMerkleProof, relayer }
)
await claim(utxos)

// Step 2 — withdraw encrypted balance → public ATA
const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client })
await withdraw(signer.address, mint, totalMicroUsdc)
```

### 5. Viewing Keys for Compliance

Employers generate a **viewing key** scoped to their payroll history. This key can be shared with an accountant or tax authority - it decrypts payment records for verification without exposing the wallet or granting any ability to move funds. The Compliance Report page uses this to produce a fully cryptographically-attested audit trail that can be exported as PDF.

### User Registration

Before any private payment can be received, both employer and employee must register with Umbra's on-chain user account system. PrivatePayroll handles this transparently — it detects on first use whether the wallet is registered and performs the one-time three-transaction setup (account init + confidential key registration + anonymous commitment) before proceeding:

```ts
const register = getUserRegistrationFunction({ client }, { zkProver })
await register({ confidential: true, anonymous: true })
```

---

## Demo Mode

Umbra's devnet Arcium MPC pools are currently pending activation (`active_stealth_pool_indices: []` from `/v1/relayer/info`). All SDK calls that require the MPC round-trip revert on devnet.

To keep the complete UX demonstrable, we built a clean **Demo Mode** — a simulation layer with realistic async delays, per-step state transitions, and localStorage-backed persistence so the employer→employee balance handoff works across wallet switches in a single browser session.

The SDK integration code in `src/lib/umbra.ts` is identical in both paths. Switching to live execution is a single flag:

```ts
// src/lib/umbra.ts
export const DEMO_MODE = true  // ← set to false when devnet MPC pools are active
```

No other code changes are needed. All function signatures, types, and call sites are identical.

---

## Features

| Page | Role | Description |
|------|------|-------------|
| **Landing** | Public | Product overview, privacy explainer, how-it-works walkthrough, wallet connect CTA |
| **Dashboard** | Employer | Live stats: active headcount, monthly payroll total, number of payroll runs, last payment date |
| **Manage Employees** | Employer | Add/remove employees — name, Solana wallet address, monthly salary, department (preset list + custom entry) |
| **Run Payroll** | Employer | One-click batch payroll with real-time per-employee progress: spinner on active, checkmark on complete, progress bar |
| **My Balance** | Employee | Scan stealth addresses for incoming salary UTXOs, view encrypted balance, withdraw to public wallet |
| **Compliance Report** | Employer | Generate auditable reports by pay period; export PDF via browser print; copy or view full viewing key with inline explainer |

---

## Tech Stack

| Layer              | Technology           | Version |
|--------------------|----------------------|---------|
| Frontend framework | React                | 19      |
| Build tool         | Vite                 | 8       |
| Language           | TypeScript           | 6       |
| Privacy protocol   | `@umbra-privacy/sdk` | 4.0.0   |
| ZK prover (browser WASM) | `@umbra-privacy/web-zk-prover` | 2.0.1 |
| Blockchain RPC     | `@solana/web3.js`    | 1.98    |
| Wallet adapter     | `@solana/wallet-adapter-*` | 0.15 |
| Wallet standard    | `@wallet-standard/core` | 1.1 |
| Routing            | React Router         | 7      |
| Icons              | Lucide React         |   —    |
| Styling            | Inline styles, dynamic dark/light theming | — |

---

## How Privacy Works

```
Employer wallet                 Umbra Mixer Pool              Employee wallet
      │                                │                               │
      │  ① ZK proof (encrypt amount)  │                               │
      ├──── createReceiverClaimableUtxo ──►  UTXO (amount hidden)      │
      │                                │                               │
      │                                │  ② Scan Merkle tree          │
      │                                │◄──────────────────────────────┤
      │                                │  ③ Decrypt matching UTXOs    │
      │                                ├──────────────────────────────►│
      │                                │                               │
      │                                │  ④ ZK proof: claim UTXO      │
      │                                │◄──────────────────────────────┤
      │                                │  ⑤ Withdraw to public ATA    │
      │                                ├──────────────────────────────►│
```

**What the blockchain sees:** A deposit into a pool and a withdrawal from a pool. No amounts. No link between depositor and recipient.

**What only the employee sees:** Their balance, decrypted locally using their private key.

**What an auditor sees (with viewing key):** The full verified payment record — but only what the employer explicitly shares.

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Phantom wallet](https://phantom.app) browser extension, switched to **devnet**
- Devnet SOL for transaction fees:
  ```bash
  solana airdrop 2 <your-address> --url devnet
  ```

### Install & Run

```bash
# Clone the repo
git clone <repo-url>
cd private-payroll

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

### Build for Production

```bash
npm run build      # Type-check + bundle → dist/
npm run preview    # Serve the production build locally
```

### Lint

```bash
npm run lint
```

---

## Using the App

### Employer Flow

1. Connect your Phantom wallet (devnet) and navigate to **Dashboard**
2. Go to **Manage Employees** → add employees with their Solana wallet address, monthly salary in USDC, and department
3. Go to **Run Payroll** → review the payment breakdown and click **Send Private Payroll**
   - On first run the app registers your wallet with Umbra (approve the Phantom signing prompt)
   - A ZK proof is generated per employee; the progress screen shows each one completing in real time
4. Go to **Compliance Report** → select a pay period, click **Generate Report**, then export PDF or copy the viewing key

### Employee Flow

1. Connect your Phantom wallet (devnet) — this must be the address the employer registered
2. Navigate to **My Balance**
   - On first visit the app registers your wallet with Umbra (approve the signing prompt — one time only)
   - The app scans the Umbra Merkle tree for UTXOs sent to your key
3. Click **Withdraw to Wallet** to claim your salary
   - Two ZK proofs are generated client-side: claim into encrypted balance, then withdraw to your token account

### Demo Mode Walkthrough

With `DEMO_MODE = true` (default), no real transactions are submitted. localStorage is used to pass the balance from the employer session to the employee session:

1. Connect **Employer wallet** → Run Payroll → complete the flow (writes demo balance to localStorage keyed by each employee's address)
2. Switch to **Employee wallet** (any address you added as an employee) → My Balance shows the deposited salary
3. Click **Withdraw** → balance clears to $0 and a simulated transaction signature is shown

---

## Project Structure

```
src/
├── lib/
│   └── umbra.ts            # All Umbra SDK calls + DEMO_MODE flag
├── context/
│   ├── PayrollContext.tsx   # Employee list and payroll run history
│   └── ThemeContext.tsx     # Dark / light mode
├── pages/
│   ├── Landing.tsx
│   ├── Dashboard.tsx
│   ├── AddEmployees.tsx
│   ├── RunPayroll.tsx
│   ├── EmployeeView.tsx
│   └── ComplianceReport.tsx
└── components/
    └── Layout.tsx           # Top nav, responsive shell, theme toggle
```

All Umbra SDK calls are isolated in `src/lib/umbra.ts` behind clean async helper functions (`initUmbraClient`, `sendPrivatePayroll`, `scanForPayroll`, `claimAndWithdraw`, etc.). The rest of the app never imports from `@umbra-privacy/sdk` directly, making the demo→production transition a one-line change.

---

## Deployed Links

| Resource | Value |
|----------|-------|
| Umbra Program ID (devnet) | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |
| PRVT test token mint | `PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta` |
| Umbra Relayer API | `https://relayer.api.umbraprivacy.com` |
| Umbra UTXO Indexer | `https://utxo-indexer.api.umbraprivacy.com` |
| Live frontend | https://private-payroll-silk.vercel.app |

---

## Screenshots

> _Add screenshots here_

| Landing | Dashboard | Employees | Run Payroll | My Balance | Compliance |
|---------|-----------|-----------|-------------|------------|------------|
| ![landing](screenshots/landing.png) | ![dashboard](screenshots/dashboard.png) | ![employee](screenshots/employee.png) | ![payroll](screenshots/payroll.png) | ![balance](screenshots/balance.png) | ![compliance](screenshots/compliance.png) |
---

## License

MIT
