require('dotenv').config();
const algosdk = require('@algorand/algosdk');
const VaultContract = require('../contracts/VaultContract');

async function deployVault() {
  console.log('🚀 Deploying UniVault Smart Contract to Algorand Testnet...\n');

  // Connect to Algorand Testnet
  const algodToken = process.env.ALGOD_TOKEN;
  const algodServer = process.env.ALGOD_SERVER;
  const algodPort = process.env.ALGOD_PORT;

  const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

  // Create test accounts
  console.log('📝 Creating test accounts...');
  const creatorAccount = algosdk.generateAccount();
  const contributor1 = algosdk.generateAccount();
  const contributor2 = algosdk.generateAccount();

  console.log('\n📋 Account Details:');
  console.log('Creator Address:', creatorAccount.addr);
  console.log('Creator Mnemonic:', algosdk.secretKeyToMnemonic(creatorAccount.sk));
  console.log('\nContributor 1:', contributor1.addr);
  console.log('Contributor 1 Mnemonic:', algosdk.secretKeyToMnemonic(contributor1.sk));
  console.log('\nContributor 2:', contributor2.addr);
  console.log('Contributor 2 Mnemonic:', algosdk.secretKeyToMnemonic(contributor2.sk));

  console.log('\n💰 Fund these accounts at: https://bank.testnet.algorand.network/');
  console.log('   (You need to fund them before continuing)\n');

  // Wait for user to fund accounts
  console.log('⏳ Waiting 30 seconds for you to fund the accounts...\n');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Initialize contract
  const vault = new VaultContract(algodClient);

  // Create a vault with goal and deadline
  console.log('🏗️  Creating Smart Vault...');
  const goalAmount = 1000000; // 1 ALGO in microAlgos
  const deadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now

  const vaultInfo = await vault.createVault(
    creatorAccount.addr,
    goalAmount,
    deadline
  );

  console.log('\n✅ Vault Created!');
  console.log('Vault Address:', vaultInfo.address);
  console.log('Goal Amount:', goalAmount / 1000000, 'ALGO');
  console.log('Deadline:', new Date(deadline * 1000).toLocaleString());

  // Create multi-contributor vault
  console.log('\n🤝 Creating Multi-Contributor Vault...');
  const multiVault = await vault.createMultiContributorVault(
    [creatorAccount.addr, contributor1.addr, contributor2.addr],
    2 // Requires 2 of 3 signatures
  );

  console.log('Multi-Sig Address:', multiVault.address);
  console.log('Threshold: 2 of 3 signatures required');

  // Create NFT Ticket
  console.log('\n🎟️  Creating NFT Ticket...');
  
  try {
    const ticketResult = await vault.createNFTTicket(
      creatorAccount,
      'Campus Fest 2025',
      100
    );

    console.log('✅ NFT Ticket Created!');
    console.log('Asset ID:', ticketResult.assetId);
    console.log('Transaction ID:', ticketResult.txId);
    console.log('View on AlgoExplorer: https://testnet.algoexplorer.io/asset/' + ticketResult.assetId);

    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: 'testnet',
      accounts: {
        creator: {
          address: creatorAccount.addr,
          mnemonic: algosdk.secretKeyToMnemonic(creatorAccount.sk)
        },
        contributor1: {
          address: contributor1.addr,
          mnemonic: algosdk.secretKeyToMnemonic(contributor1.sk)
        },
        contributor2: {
          address: contributor2.addr,
          mnemonic: algosdk.secretKeyToMnemonic(contributor2.sk)
        }
      },
      vaults: {
        conditional: {
          address: vaultInfo.address,
          goalAmount: goalAmount,
          deadline: deadline
        },
        multiSig: {
          address: multiVault.address,
          threshold: 2,
          participants: 3
        }
      },
      nftTicket: {
        assetId: ticketResult.assetId,
        eventName: 'Campus Fest 2025',
        totalSupply: 100
      }
    };

    require('fs').writeFileSync(
      'deployment-info.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n📄 Deployment info saved to deployment-info.json');

  } catch (error) {
    console.error('❌ Error creating NFT:', error.message);
    console.log('💡 Make sure your creator account is funded!');
  }

  console.log('\n========================================');
  console.log('✅ Deployment Complete!');
  console.log('========================================');
  console.log('\nNext Steps:');
  console.log('1. Save your account mnemonics securely');
  console.log('2. Run: npm start');
  console.log('3. Open: http://localhost:3000');
  console.log('\n🎉 Your UniVault is ready to demo!\n');
}

// Run deployment
deployVault().catch(console.error);
