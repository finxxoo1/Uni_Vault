# 🏗️ UniVault Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                    (Mobile-First Web App)                    │
│                      http://localhost:3000                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express API Server                      │
│                         (Node.js)                            │
│                                                              │
│  Endpoints:                                                  │
│  • GET  /api/info                                           │
│  • GET  /api/vault/:address/balance                         │
│  • POST /api/vault/create                                   │
│  • GET  /api/ticket/verify/:address/:assetId                │
│  • GET  /api/account/:address                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Algorand SDK Layer                        │
│                   (@algorand/algosdk)                        │
│                                                              │
│  Functions:                                                  │
│  • Account generation                                        │
│  • Transaction signing                                       │
│  • TEAL compilation                                          │
│  • Asset creation (NFTs)                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Algorand Testnet                           │
│                (Blockchain Layer 1)                          │
│                                                              │
│  Components:                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Smart Contracts  │  │   NFT Assets     │                │
│  │                  │  │                  │                │
│  │ • LogicSig       │  │ • Event Tickets  │                │
│  │ • Multi-Sig      │  │ • Asset ID       │                │
│  │ • Conditional    │  │ • Metadata       │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend Layer (public/index.html)
**Technology:** Vanilla HTML/CSS/JavaScript
**Purpose:** User interaction interface

**Features:**
- 📱 Mobile-first responsive design
- 🎨 Three-tab navigation (Dashboard, Create Vault, Tickets)
- ⚡ Real-time blockchain data display
- 🔄 AJAX calls to backend API

**Key UI Components:**
```
Dashboard Tab
├── Deployment Status Card
├── Active Vaults Card
│   ├── Conditional Vault
│   └── Multi-Sig Vault
└── NFT Tickets Card

Create Vault Tab
├── Vault Creation Form
├── Goal & Deadline Inputs
└── Success/Error Messages

Tickets Tab
├── Verification Form
└── QR Scanner Placeholder
```

---

### 2. Backend Layer (server.js)
**Technology:** Express.js + Node.js
**Purpose:** API gateway to Algorand blockchain

**Responsibilities:**
- 🔌 Route HTTP requests
- 🔐 Manage Algorand client connections
- 📊 Format blockchain data for frontend
- 🛡️ Error handling and validation

**API Routes:**
```javascript
GET  /api/info                              // Get deployment info
GET  /api/vault/:address/balance            // Check vault balance
POST /api/vault/create                      // Create new vault
GET  /api/ticket/verify/:address/:assetId   // Verify ticket ownership
GET  /api/account/:address                  // Get account details
GET  /api/health                            // Health check
```

---

### 3. Smart Contract Layer (contracts/VaultContract.js)
**Technology:** Algorand TEAL via JS SDK
**Purpose:** Business logic enforcement on blockchain

#### 3.1 Conditional Vault (LogicSig)
**TEAL Logic:**
```teal
#pragma version 8

// Check transaction type is payment
txn TypeEnum
int pay
==

// Check amount meets or exceeds goal
txn Amount
int GOAL_AMOUNT
>=
&&

// Check deadline hasn't passed
txn FirstValid
int DEADLINE
<=
&&

// Check receiver is authorized
txn Receiver
addr CREATOR_ADDRESS
==
&&
```

**Enforces:**
- ✅ Funds only released if goal met
- ✅ Deadline validation
- ✅ Authorized receiver check

#### 3.2 Multi-Signature Vault
**Configuration:**
```javascript
{
  version: 1,
  threshold: 2,        // 2 of 3 required
  addrs: [addr1, addr2, addr3]
}
```

**Enforces:**
- ✅ Requires 2 signatures from 3 authorized accounts
- ✅ Prevents single point of failure
- ✅ Democratic fund management

#### 3.3 NFT Ticketing System
**Asset Creation:**
```javascript
{
  total: 100,           // Total ticket supply
  decimals: 0,          // Indivisible tickets
  assetName: "Event",   // Event name
  unitName: "TICKET",   // Ticker
  freeze: true,         // Prevent transfers
  clawback: true        // Revoke if needed
}
```

**Features:**
- 🎟️ Unique asset ID per event
- 🔒 Non-fungible (decimals: 0)
- ✅ Verifiable ownership
- 🚫 Fraud prevention

---

## Data Flow Examples

### Example 1: Creating a Vault
```
User (Browser)
   │
   │ 1. Fill form (name, goal, deadline)
   ▼
Frontend (index.html)
   │
   │ 2. POST /api/vault/create
   ▼
Backend (server.js)
   │
   │ 3. Call VaultContract.createVault()
   ▼
Algorand SDK
   │
   │ 4. Compile TEAL program
   │ 5. Generate vault address
   ▼
Algorand Testnet
   │
   │ 6. Contract deployed
   ◄─────┐
   │     │ 7. Return vault address
   ▼     │
User sees vault created ✅
```

### Example 2: Verifying a Ticket
```
User (Browser)
   │
   │ 1. Enter address + Asset ID
   ▼
Frontend
   │
   │ 2. GET /api/ticket/verify/:address/:assetId
   ▼
Backend
   │
   │ 3. Call algodClient.accountInformation()
   ▼
Algorand Testnet
   │
   │ 4. Query account assets
   ◄─────┐
   │     │ 5. Return asset holdings
   ▼     │
User sees verification ✅/❌
```

### Example 3: Funding a Vault
```
Contributor 1
   │
   │ 1. Send ALGO to vault address
   ▼
Algorand Testnet
   │
   │ 2. Transaction recorded on blockchain
   │ 3. Vault balance updates
   ▼
Smart Contract
   │
   │ 4. Check if goal met
   │ 5. If yes: enable fund release
   │ 6. If no: keep locked
   ▼
Dashboard
   │
   │ 7. Balance updates in real-time
   ▼
All users see updated balance 📊
```

---

## Security Model

### 1. Key Management
```
Creator Account (Testnet)
├── Private Key: Stored locally (deployment-info.json)
├── Public Address: Shared with vault
└── Mnemonic: For account recovery

⚠️ PRODUCTION: Use hardware wallets or MPC
```

### 2. Contract Immutability
```
Once deployed:
├── TEAL code cannot change
├── Rules are permanent
└── No admin backdoors

This ensures:
✅ Trustless operation
✅ Transparent enforcement
✅ No human intervention needed
```

### 3. Multi-Signature Protection
```
Large Fund Vaults:
├── Require M of N signatures
├── Example: 2 of 3 club officers
└── Prevents single-person control

Benefits:
✅ Democratic decision-making
✅ Fraud prevention
✅ Dispute resolution
```

---

## Algorand Network Configuration

### Testnet Connection
```javascript
const algodClient = new algosdk.Algodv2(
  'aaaa...aaaa',                       // Token (public testnet)
  'https://testnet-api.algonode.cloud', // Server
  443                                   // Port
);
```

### Transaction Costs
```
Base Transaction Fee: 0.001 ALGO (~$0.0003 USD)
Asset Creation: 0.1 ALGO (one-time)
Asset Transfer: 0.001 ALGO

VS. Competitors:
• Ethereum: $1-50 per transaction
• Polygon: $0.01-0.10 per transaction
• Solana: $0.00025 per transaction
```

### Performance Characteristics
```
Block Time: ~3.3 seconds
Finality: Instant (no confirmations needed)
TPS: ~6,000 transactions per second
Energy: Carbon negative (proof-of-stake)
```

---

## File Structure Breakdown

```
univault-mvp/
│
├── contracts/
│   └── VaultContract.js          # Smart contract wrapper
│       ├── createVault()         # Deploy conditional vault
│       ├── createMultiContributorVault()
│       ├── createNFTTicket()     # Mint event tickets
│       ├── transferTicket()      # Send ticket to attendee
│       └── verifyTicket()        # Check ownership
│
├── scripts/
│   └── deploy-vault.js           # Deployment automation
│       ├── Generate test accounts
│       ├── Deploy conditional vault
│       ├── Deploy multi-sig vault
│       ├── Mint NFT ticket
│       └── Save deployment info
│
├── public/
│   └── index.html                # Frontend UI
│       ├── Dashboard tab         # View deployed contracts
│       ├── Create Vault tab      # New vault form
│       └── Tickets tab           # Verification interface
│
├── server.js                     # Express API server
│   ├── /api/info                # Deployment details
│   ├── /api/vault/*             # Vault operations
│   ├── /api/ticket/*            # Ticket operations
│   └── /api/account/*           # Account queries
│
├── package.json                  # Dependencies
├── .env                          # Configuration
├── setup.sh                      # One-time setup
├── start.sh                      # Quick start script
├── README.md                     # Documentation
├── COMMANDS.txt                  # Copy-paste commands
├── QUICK-START.txt              # Quick reference
└── DEMO-SCRIPT.md               # Presentation guide
```

---

## Deployment Process

```
Step 1: Install Dependencies
   npm install
   └── Downloads @algorand/algosdk, express, etc.

Step 2: Deploy Contracts
   npm run deploy-contract
   ├── Generate 3 test accounts
   ├── Fund accounts at Algorand faucet
   ├── Deploy conditional vault (TEAL)
   ├── Deploy multi-sig vault
   ├── Mint NFT ticket (ASA)
   └── Save deployment-info.json

Step 3: Start Server
   npm start
   ├── Launch Express on port 3000
   ├── Initialize Algorand client
   ├── Load deployment info
   └── Serve frontend

Step 4: Use Application
   Open http://localhost:3000
   └── Interact with deployed contracts
```

---

## Future Enhancements

### Phase 2 (Pilot)
```
✅ QR code generation
✅ Camera-based ticket scanning
✅ Real event integration
✅ Mobile app (React Native)
```

### Phase 3 (Scale)
```
✅ On-chain reputation system
✅ Cross-university interoperability
✅ Batch payment processing
✅ Governance token for platform decisions
```

### Advanced Features
```
✅ Atomic swaps for vendor payments
✅ Recurring payment schedules
✅ Multi-currency support (stablecoins)
✅ Integration with existing campus systems
```

---

## Monitoring & Debugging

### View Transactions
```
AlgoExplorer Testnet:
https://testnet.algoexplorer.io/

Search by:
• Address (vault or account)
• Transaction ID
• Asset ID (for NFT tickets)
```

### Check Logs
```bash
# Server logs
npm start

# Contract deployment logs
npm run deploy-contract
```

### Common Issues
```
Issue: "Insufficient funds"
Fix: Fund accounts at https://bank.testnet.algorand.network/

Issue: "Transaction rejected"
Fix: Check TEAL logic, ensure conditions met

Issue: "Asset not found"
Fix: Verify Asset ID, ensure it was created
```

---

## Conclusion

UniVault leverages Algorand's high-performance Layer 1 to deliver:
- **Transparency**: All transactions on public blockchain
- **Security**: Immutable smart contracts enforce rules
- **Efficiency**: Sub-penny transaction costs
- **Speed**: 3-second finality
- **Simplicity**: No crypto expertise needed

This architecture demonstrates a production-ready foundation for campus-wide financial infrastructure.
