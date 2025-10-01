'use strict';

const { Contract } = require('fabric-contract-api');

class BarangayContract extends Contract {

  async initLedger(ctx) {
    console.log('Barangay Ledger Initialized');
  }

  // Create a document request record
  async createDocumentRequest(ctx, requestId, residentId, documentType, purpose, issuedBy) {
    const request = {
      requestId,
      residentId,
      documentType,
      purpose,
      issuedBy,
      status: 'pending',
      issuedAt: new Date().toISOString()
    };

    await ctx.stub.putState(requestId, Buffer.from(JSON.stringify(request)));
    return JSON.stringify(request);
  }

  // Get document request by ID
  async getDocumentRequest(ctx, requestId) {
    const requestBytes = await ctx.stub.getState(requestId);
    if (!requestBytes || requestBytes.length === 0) {
      throw new Error(`DocumentRequest ${requestId} does not exist`);
    }
    return requestBytes.toString();
  }

  // Update status
  async updateDocumentStatus(ctx, requestId, status) {
    const requestBytes = await ctx.stub.getState(requestId);
    if (!requestBytes || requestBytes.length === 0) {
      throw new Error(`DocumentRequest ${requestId} does not exist`);
    }

    const request = JSON.parse(requestBytes.toString());
    request.status = status;
    request.updatedAt = new Date().toISOString();

    await ctx.stub.putState(requestId, Buffer.from(JSON.stringify(request)));
    return JSON.stringify(request);
  }
}

module.exports = BarangayContract;
