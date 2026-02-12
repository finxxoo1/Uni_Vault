require('dotenv').config();
const express = require('express');
const cors = require('cors');
const algosdk = require('@algorand/algosdk');
const VaultContract = require('./contracts/VaultContract');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Algorand client
const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const vault = new VaultContract(algodClient);

// Load deployment info
let deploymentInfo = {};
try {
  deploymentInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
} catch (error) {
  console.log('No deployment info found. Run deployment first.');
}

// API Routes

// Get deployment info
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: deploymentInfo
  });
});

// Get vault balance
app.get('/api/vault/:address/balance', async (req, res) => {
  try {
    const balance = await vault.getVaultBalance(req.params.address);
    res.json({
      success: true,
      balance: balance,
      balanceInAlgo: balance / 1000000
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new vault
app.post('/api/vault/create', async (req, res) => {
  try {
    const { creator, goalAmount, deadline } = req.body;
    
    const vaultInfo = await vault.createVault(creator, goalAmount, deadline);
    
    res.json({
      success: true,
      vault: vaultInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create NFT ticket
app.post('/api/ticket/create', async (req, res) => {
  try {
    const { eventName, totalSupply } = req.body;
    
    // This would need the creator account - in production, use proper key management
    res.json({
      success: true,
      message: 'Use deployment script to create tickets with proper account management'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify ticket
app.get('/api/ticket/verify/:address/:assetId', async (req, res) => {
  try {
    const { address, assetId } = req.params;
    
    const verification = await vault.verifyTicket(address, parseInt(assetId));
    
    res.json({
      success: true,
      verified: verification.hasTicket,
      ticketCount: verification.amount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get account info
app.get('/api/account/:address', async (req, res) => {
  try {
    const accountInfo = await algodClient.accountInformation(req.params.address).do();
    
    res.json({
      success: true,
      account: {
        address: accountInfo.address,
        balance: accountInfo.amount,
        balanceInAlgo: accountInfo.amount / 1000000,
        assets: accountInfo.assets || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'UniVault API is running',
    network: 'Algorand Testnet'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║                                        ║
║         🎓 UniVault MVP Server         ║
║                                        ║
╚════════════════════════════════════════╝

✅ Server running on http://localhost:${PORT}
🌐 Network: Algorand Testnet
📊 API Endpoints:
   - GET  /api/info
   - GET  /api/vault/:address/balance
   - POST /api/vault/create
   - GET  /api/ticket/verify/:address/:assetId
   - GET  /api/account/:address
   - GET  /api/health

🎉 Ready for demo!
  `);
});
