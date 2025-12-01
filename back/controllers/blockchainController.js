const { getContract } = require("../utils/fabricClient");
const os = require("os");

exports.getBlockchainStatus = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only" });
  }
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
      console.warn('Partial blockchain status (skipping channel details):', innerErr.message);
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
    console.error("Blockchain status error:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to retrieve blockchain status",
    });
  }
};

// Public (authenticated) lite status: exposes only basic non-sensitive metrics
exports.getBlockchainStatusLite = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const started = Date.now();
  try {
    const { gateway, contract } = await getContract();
    const network = contract.network || (gateway.getNetwork && await gateway.getNetwork('mychannel'));
    const channel = network && typeof network.getChannel === 'function' ? network.getChannel() : null;

    let blockHeight = null;
    try {
      if (channel && typeof channel.queryInfo === 'function') {
        const info = await channel.queryInfo();
        const heightStr = (info.height && (info.height.toString ? info.height.toString() : info.height.low)) ?? null;
        blockHeight = heightStr != null ? parseInt(heightStr, 10) : null;
      }
    } catch (innerErr) {
      console.warn('Lite status: unable to query block height:', innerErr.message);
    } finally {
      await gateway.disconnect();
    }
    const latencyMs = Date.now() - started;
    res.json({
      ok: true,
      channel: channel && typeof channel.getName === 'function' ? channel.getName() : 'mychannel',
      blockHeight,
      latencyMs,
      observedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Blockchain lite status error:', error);
    res.status(500).json({ ok: false, message: error.message || 'Failed to retrieve blockchain status' });
  }
};

exports.getAllBlockchainRequests = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only" });
  }
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
    console.error("Error fetching blockchain requests:", error);
    res.status(500).json({ message: "Failed to load blockchain requests", error: error.message });
  }
};

// Financial transactions from chaincode (FinancialTransactionContract)
exports.getAllFinancialTransactions = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only" });
  }
  try {
    const { gateway, contract } = await getContract();

    // Evaluate query on the FinancialTransactionContract within same chaincode package
    const result = await contract.evaluateTransaction(
      'FinancialTransactionContract:getAllTransactions'
    );
    const txns = JSON.parse(result.toString());

    await gateway.disconnect();

    // Sort newest first by createdAt when available
    const sorted = Array.isArray(txns)
      ? txns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      : [];

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching blockchain financial transactions:', error);
    res.status(500).json({ message: 'Failed to load blockchain financial transactions', error: error.message });
  }
};


// Resident-scoped: get blockchain requests relevant to the authenticated resident
// Includes the resident and their household (head + members) so requests made "for"
// family members also appear in the resident's view.
exports.getResidentBlockchainRequests = async (req, res) => {
  try {
    const Resident = require('../models/resident.model');
    const Household = require('../models/household.model');

    const resident = await Resident.findOne({ user: req.user.id }).select('_id').lean();
    if (!resident) return res.status(404).json({ message: 'Resident profile not found' });

    // Build the set of resident IDs relevant to the viewer (self + household)
    const idSet = new Set([resident._id.toString()]);
    try {
      const hh = await Household.findOne({
        $or: [
          { headOfHousehold: resident._id },
          { members: resident._id },
        ],
      }).select('headOfHousehold members').lean();
      if (hh) {
        const headId = (hh.headOfHousehold && hh.headOfHousehold.toString) ? hh.headOfHousehold.toString() : String(hh.headOfHousehold || '');
        if (headId) idSet.add(headId);
        (hh.members || []).forEach(m => {
          const mid = (m && m.toString) ? m.toString() : String(m || '');
          if (mid) idSet.add(mid);
        });
      }
    } catch (hhErr) {
      // Non-fatal: proceed with only the resident's own ID
      console.warn('Household lookup failed for blockchain requests:', hhErr.message || hhErr);
    }

    const { gateway, contract } = await getContract();
    const result = await contract.evaluateTransaction('getAllRequests');
    const all = JSON.parse(result.toString());
    await gateway.disconnect();

    // Keep requests whose residentId matches any relevant ID
    const relevant = Array.isArray(all)
      ? all.filter(r => idSet.has(String(r?.residentId || '')))
      : [];

    // Sort newest first
    relevant.sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));

    res.json(relevant);
  } catch (error) {
    console.error('Error fetching resident blockchain requests:', error);
    res.status(500).json({ message: 'Failed to load resident blockchain requests', error: error.message });
  }
};

// Resident-scoped: get only the blockchain financial transactions for the authenticated resident
exports.getResidentFinancialTransactions = async (req, res) => {
  try {
    const Resident = require('../models/resident.model');
    const Household = require('../models/household.model');
    const DocumentRequest = require('../models/document.model');

    const resident = await Resident.findOne({ user: req.user.id });
    if (!resident) return res.status(404).json({ message: 'Resident profile not found' });

    // Many utility payments are attributed to the head of household on-chain.
    // If the logged-in resident is a member, include the head's ID for the query.
    const household = await Household.findOne({
      $or: [
        { headOfHousehold: resident._id },
        { members: resident._id },
      ],
    }).lean();

    const queryIds = new Set([resident._id.toString()]);
    // Include special resident(s) named "Barangay Official" regardless of household
    try {
      const barangayOfficials = await Resident.find({
        $or: [
          { firstName: /barangay/i, lastName: /official/i },
          { middleName: /barangay official/i }, // coverage if stored differently
        ]
      }).select('_id firstName middleName lastName suffix');
      barangayOfficials.forEach(o => queryIds.add(o._id.toString()));
    } catch (officialErr) {
      console.warn('Failed to lookup Barangay Official resident(s):', officialErr.message || officialErr);
    }
    // Also consider the authenticated user id; some txns may have used userId instead of residentId
    if (req.user?.id) queryIds.add(req.user.id.toString());
    if (household?.headOfHousehold) {
      const headId = household.headOfHousehold.toString();
      queryIds.add(headId);
    }

    const { gateway, contract } = await getContract();

    // Fetch transactions for each relevant resident id (including Barangay Official) and merge
    const results = [];
    for (const id of Array.from(queryIds)) {
      try {
        const buf = await contract.evaluateTransaction(
          'FinancialTransactionContract:getTransactionsByResident',
          id
        );
        const parsed = JSON.parse(buf.toString());
        if (Array.isArray(parsed)) results.push(...parsed);
      } catch (innerErr) {
        // Non-fatal for secondary IDs
        console.warn('Resident financial txn query failed for id', id, innerErr.message || innerErr);
      }
    }
    
    // Fallback enrichment: fetch all transactions and filter by related document requests owned by the resident/household
    try {
      const allBuf = await contract.evaluateTransaction(
        'FinancialTransactionContract:getAllTransactions'
      );
      const allTxns = JSON.parse(allBuf.toString());
      // Build allowed request ids: any request where residentId or requestedBy is the resident or head of household
      const allowedPersonIds = Array.from(queryIds);
      const allowedRequests = await DocumentRequest.find({
        $or: [
          { residentId: { $in: allowedPersonIds } },
          { requestedBy: { $in: allowedPersonIds } },
        ],
      }).select('_id').lean();
      const allowedReqIdSet = new Set(allowedRequests.map(r => r._id.toString()));
      const related = Array.isArray(allTxns) ? allTxns.filter(t => t?.requestId && allowedReqIdSet.has(t.requestId.toString())) : [];
      results.push(...related);
      // Also include any transaction whose description or residentName explicitly mentions "Barangay Official"
      const officialKeyword = /barangay\s+official/i;
      const officialTxns = Array.isArray(allTxns) ? allTxns.filter(t => {
        return officialKeyword.test(String(t?.description || '')) || officialKeyword.test(String(t?.residentName || ''));
      }) : [];
      results.push(...officialTxns);
    } catch (fallbackErr) {
      console.warn('Fallback all-transactions filter failed:', fallbackErr.message || fallbackErr);
    }
    await gateway.disconnect();

    // Deduplicate by txId (fallback to JSON string hash)
    const seen = new Set();
    const merged = [];
    for (const t of results) {
      const key = t.txId || `${t.requestId || ''}-${t.amount || ''}-${t.createdAt || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(t);
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching resident blockchain financial transactions:', error);
    res.status(500).json({ message: 'Failed to load resident blockchain financial transactions', error: error.message });
  }
};

const DocumentRequest = require("../models/document.model");

exports.syncFromDB = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access only" });
  }
  try {
    const { gateway, contract } = await getContract();

    // Populate to get human-readable names instead of ObjectId hashes
    const requests = await DocumentRequest.find({})
      .populate('residentId')
      .populate('requestedBy');

    // Helper to format resident full name safely
    const formatName = (person) => {
      if (!person || typeof person !== 'object') return '';
      const parts = [person.firstName, person.middleName, person.lastName, person.suffix]
        .filter(Boolean)
        .map(String);
      return parts.join(' ').trim();
    };

    let synced = 0;
    for (const r of requests) {
  const requestId = r._id.toString();
  const residentIdStr = r.residentId?._id?.toString?.() || '';
  const requestedByName = formatName(r.requestedBy || r.residentId);

  try {
    const existing = await contract.evaluateTransaction('getRequest', requestId);

    if (existing && existing.length > 0) {
      console.log(`Skipping existing blockchain record ${requestId}`);
      continue; // do not overwrite
    }

    await contract.submitTransaction(
      'createRequest',
      requestId,
      residentIdStr,
      requestedByName,
      r.documentType,
      r.purpose || '',
      r.status || 'pending'
    );
    synced += 1;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      // Only create if truly missing
      await contract.submitTransaction(
        'createRequest',
        requestId,
        residentIdStr,
        requestedByName,
        r.documentType,
        r.purpose || '',
        r.status || 'pending'
      );
      synced += 1;
    } else {
      console.warn(`Failed to sync ${requestId}:`, err.message);
    }
  }
}


    await gateway.disconnect();
    res.json({ message: 'Sync complete', count: synced });
  } catch (error) {
    console.error('Error syncing from DB:', error);
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
};
