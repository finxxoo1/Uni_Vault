const algosdk = require('@algorand/algosdk');

/**
 * UniVault Smart Contract
 * This contract manages student organization funds with conditional release
 */

class VaultContract {
  constructor(algodClient) {
    this.algodClient = algodClient;
  }

  /**
   * Create a LogicSig vault that releases funds only when goal is met
   * @param {string} creator - Creator address
   * @param {number} goalAmount - Target amount in microAlgos
   * @param {number} deadline - Unix timestamp deadline
   */
  async createVault(creator, goalAmount, deadline) {
    // Smart contract logic in TEAL
    const tealSource = `
#pragma version 8
// UniVault Smart Contract - Conditional Fund Release

// Check if transaction is payment
txn TypeEnum
int pay
==

// Check if amount meets goal
txn Amount
int ${goalAmount}
>=
&&

// Check if before deadline
txn FirstValid
int ${deadline}
<=
&&

// Check receiver is creator
txn Receiver
addr ${creator}
==
&&
`;

    // Compile the TEAL program
    const compiledProgram = await this.compileTeal(tealSource);
    
    return {
      program: compiledProgram,
      address: algosdk.getApplicationAddress(compiledProgram.hash),
      teal: tealSource
    };
  }

  /**
   * Compile TEAL source code
   */
  async compileTeal(tealSource) {
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(tealSource);
    const compileResponse = await this.algodClient.compile(programBytes).do();
    
    return {
      result: compileResponse.result,
      hash: compileResponse.hash,
      bytes: new Uint8Array(Buffer.from(compileResponse.result, 'base64'))
    };
  }

  /**
   * Create a multi-contributor vault using multisig
   */
  async createMultiContributorVault(addresses, threshold = 2) {
    const mparams = {
      version: 1,
      threshold: threshold,
      addrs: addresses
    };

    const multisigAddr = algosdk.multisigAddress(mparams);
    
    return {
      address: multisigAddr,
      params: mparams
    };
  }

  /**
   * Fund the vault
   */
  async fundVault(vaultAddress, senderAccount, amount) {
    const params = await this.algodClient.getTransactionParams().do();
    
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: senderAccount.addr,
      to: vaultAddress,
      amount: amount,
      suggestedParams: params
    });

    const signedTxn = txn.signTxn(senderAccount.sk);
    const txId = await this.algodClient.sendRawTransaction(signedTxn).do();
    
    return txId;
  }

  /**
   * Create NFT ticket for event
   */
  async createNFTTicket(creatorAccount, eventName, totalSupply = 100) {
    const params = await this.algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: creatorAccount.addr,
      total: totalSupply,
      decimals: 0,
      assetName: eventName,
      unitName: 'TICKET',
      assetURL: `https://univault.io/events/${eventName}`,
      manager: creatorAccount.addr,
      reserve: creatorAccount.addr,
      freeze: creatorAccount.addr,
      clawback: creatorAccount.addr,
      defaultFrozen: false,
      suggestedParams: params
    });

    const signedTxn = txn.signTxn(creatorAccount.sk);
    const txId = await this.algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    const result = await algosdk.waitForConfirmation(this.algodClient, txId.txId, 4);
    const assetId = result['asset-index'];

    return {
      assetId: assetId,
      txId: txId.txId
    };
  }

  /**
   * Transfer NFT ticket to attendee
   */
  async transferTicket(assetId, fromAccount, toAddress, amount = 1) {
    const params = await this.algodClient.getTransactionParams().do();

    // Receiver must opt-in first
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: toAddress,
      to: toAddress,
      assetIndex: assetId,
      amount: 0,
      suggestedParams: params
    });

    // Transfer ticket
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: fromAccount.addr,
      to: toAddress,
      assetIndex: assetId,
      amount: amount,
      suggestedParams: params
    });

    const signedTxn = transferTxn.signTxn(fromAccount.sk);
    const txId = await this.algodClient.sendRawTransaction(signedTxn).do();
    
    return txId;
  }

  /**
   * Check vault balance
   */
  async getVaultBalance(vaultAddress) {
    const accountInfo = await this.algodClient.accountInformation(vaultAddress).do();
    return accountInfo.amount;
  }

  /**
   * Verify ticket ownership
   */
  async verifyTicket(address, assetId) {
    const accountInfo = await this.algodClient.accountInformation(address).do();
    const asset = accountInfo.assets.find(a => a['asset-id'] === assetId);
    
    return {
      hasTicket: !!asset,
      amount: asset ? asset.amount : 0
    };
  }
}

module.exports = VaultContract;
