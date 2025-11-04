const { getContract } = require("../utils/fabricClient");
const os = require("os");

exports.getBlockchainStatus = async (req, res) => {
  const started = Date.now();
  try {
    const { gateway, contract } = await getContract();
    // Prefer using the public Network API directly from the gateway rather than private contract internals
    const network = contract.network || (gateway.getNetwork && await gateway.getNetwork('mychannel'));
    const channel = network && typeof network.getChannel === 'function' ? network.getChannel() : null;

    // Query the latest block height if available (SDK versions may differ)
    let blockHeight = null;
    let peers = [];
    try {
      if (channel && typeof channel.queryInfo === 'function') {
        const info = await channel.queryInfo();
        // info.height can be a Long; use toString then parse for safety
        const heightStr = (info.height && (info.height.toString ? info.height.toString() : info.height.low)) ?? null;
        blockHeight = heightStr != null ? parseInt(heightStr, 10) : null;
      }
      if (channel && typeof channel.getPeers === 'function') {
        peers = channel.getPeers().map(p => ({
          name: typeof p.getName === 'function' ? p.getName() : p.name,
          url: typeof p.getUrl === 'function' ? p.getUrl() : undefined,
        }));
      }
    } catch (innerErr) {
      // Non-fatal: still return a status payload so the dashboard can render
      console.warn('⚠️ Partial blockchain status (skipping channel details):', innerErr.message);
    } finally {
      await gateway.disconnect();
    }

    const latencyMs = Date.now() - started;
    res.json({
      ok: true,
      channel: channel && typeof channel.getName === 'function' ? channel.getName() : 'mychannel',
      peers,
      blockHeight,
      chaincode: { name: contract.chaincodeId },
      latencyMs,
      observedAt: new Date().toISOString(),
      host: os.hostname(),
    });
  } catch (error) {
    console.error("❌ Blockchain status error:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to retrieve blockchain status",
    });
  }
};

exports.getAllBlockchainRequests = async (req, res) => {
  try {
    const { gateway, contract } = await getContract();

    // Query the ledger for all requests
    const result = await contract.evaluateTransaction("getAllRequests");
    const requests = JSON.parse(result.toString());

    await gateway.disconnect();

    // Optional: sort by date descending (most recent first)
    const sorted = requests.sort(
      (a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0)
    );

    res.json(sorted);
  } catch (error) {
    console.error("❌ Error fetching blockchain requests:", error);
    res.status(500).json({ message: "Failed to load blockchain requests", error: error.message });
  }
};


const DocumentRequest = require("../models/document.model");

exports.syncFromDB = async (req, res) => {
  try {
    const { gateway, contract } = await getContract();
    const requests = await DocumentRequest.find({});

    for (const r of requests) {
      await contract.submitTransaction(
        "createRequest",
        r._id.toString(),
        r.requestedBy?.toString() || "",
        r.documentType,
        r.purpose || "",
        r.status || "pending"
      );
    }

    await gateway.disconnect();
    res.json({ message: "✅ Sync complete", count: requests.length });
  } catch (error) {
    console.error("❌ Error syncing from DB:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
};
