const { getContract } = require('./fabricClient');

/**
 * Submits a financial transaction to Hyperledger Fabric.
 * @param {Object} transaction
 */

async function submitFinancialTransactionToFabric(transaction) {
  try {
    const { gateway, contract } = await getContract('documentrequest');

    const txId = transaction._id?.toString() || `TX-${Date.now()}`;
    const residentId = transaction.residentId?.toString() || '';
    const residentName = transaction.residentName || 'Unknown Resident';
    const amount = String(transaction.amount || 0);
    const paymentMethod = (transaction.paymentMethod || 'cash').toString().toLowerCase();
    const description = transaction.description || 'Financial Transaction';

    // Ensure there is a valid linked request on-chain to satisfy chaincode check
    let requestId = transaction.documentRequestId?.toString();
    if (!requestId || requestId === 'REQ-NA') {
      // Synthesize a requestId similar to utility payments to avoid chaincode rejection
      const safeType = (transaction.type || 'other').toString().toUpperCase();
      const suffix = txId.slice(-8);
      requestId = `FIN-${safeType}-${suffix}`;
      try {
        await contract.submitTransaction(
          'createRequest',
          requestId,
          residentId,
          residentName,
          'financial_transaction',
          description,
          'completed'
        );
      } catch (e) {
        // Non-fatal: request might already exist; continue
        console.warn('createRequest skipped or failed for financial tx:', e.message || e);
      }
    }

    const result = await contract.submitTransaction(
      'FinancialTransactionContract:createTransaction',
      txId,
      requestId,
      residentId || 'RES-NA',
      residentName,
      amount,
      paymentMethod,
      description
    );

    console.log('✅ Fabric transaction submitted:', result.toString());
    await gateway.disconnect();

    try {
      return { ok: true, result: JSON.parse(result.toString()) };
    } catch {
      return { ok: true, result: result.toString() };
    }
  } catch (error) {
    console.error('❌ Error submitting to Fabric:', error.message);
    return { ok: false, error: error.message };
  }
}

module.exports = { submitFinancialTransactionToFabric };
