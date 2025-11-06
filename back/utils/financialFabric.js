const { getContract } = require('./fabricClient');

/**
 * Submits a financial transaction to Hyperledger Fabric.
 * Mirrors your Express transaction creation to blockchain.
 * @param {Object} transaction - Transaction object from MongoDB
 */
async function submitFinancialTransactionToFabric(transaction) {
  try {
    const { gateway, contract } = await getContract('documentrequest');

    // Use your FinancialTransactionContract
    const result = await contract.submitTransaction(
      'FinancialTransactionContract:createTransaction',
      transaction._id?.toString() || `TX-${Date.now()}`,        // txId
      transaction.documentRequestId?.toString() || 'REQ-NA',    // requestId (or "NA" if none)
      transaction.residentId?.toString() || 'RES-NA',           // residentId
      transaction.residentName || 'Unknown Resident',           // resident name
      String(transaction.amount || 0),                          // amount
      transaction.paymentMethod || 'cash',                      // payment method
      transaction.description || 'Financial Transaction'        // description
    );

    console.log('✅ Fabric transaction submitted:', result.toString());
    await gateway.disconnect();

    return { ok: true, result: JSON.parse(result.toString()) };
  } catch (error) {
    console.error('❌ Error submitting to Fabric:', error.message);
    return { ok: false, error: error.message };
  }
}

module.exports = { submitFinancialTransactionToFabric };
