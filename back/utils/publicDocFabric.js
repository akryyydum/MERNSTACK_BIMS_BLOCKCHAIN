const { getContract } = require("./fabricClient");

/**
 * Record a public document on the blockchain.
 */
exports.submitPublicDocumentToFabric = async (doc, fileHash) => {
  try {
    const { gateway, contract } = await getContract(
      "documentrequest",
      "PublicDocumentContract"
    );

    const result = await contract.submitTransaction(
      "createDocument",
      doc._id.toString(),
      doc.title,
      doc.description || "",
      doc.category || "General",
      doc.originalName,
      doc.storedFilename,
      doc.mimeType,
      String(doc.size),
      doc.path,
      doc.uploadedBy?.toString() || "",
      fileHash   // ✅ REQUIRED
    );

    await gateway.disconnect();

    return { ok: true, result: JSON.parse(result.toString()) };
  } catch (err) {
    console.error("Blockchain write failed:", err.message);
    return { ok: false, error: err.message };
  }
};


/**
 * Query all public documents from the ledger.
 */
exports.getAllPublicDocumentsFromFabric = async () => {
  try {
    const { gateway, contract } = await getContract("documentrequest", "PublicDocumentContract");
    const result = await contract.evaluateTransaction("getAllDocuments");
    await gateway.disconnect();
    return JSON.parse(result.toString());
  } catch (err) {
    console.error("Blockchain query failed:", err.message);
    return [];
  }
};
