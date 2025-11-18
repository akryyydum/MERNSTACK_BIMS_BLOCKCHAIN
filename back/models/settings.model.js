const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    // Garbage fees are monthly totals (kept field names for compatibility)
    garbageFeeRegularAnnual: { type: Number, default: 35 },
    garbageFeeBusinessAnnual: { type: Number, default: 50 },

    // Streetlight is a monthly fee
    streetlightMonthlyFee: { type: Number, default: 10 },

    // Document request fees
    documentFees: {
      indigency: { type: Number, default: 0 },
      barangayClearance: { type: Number, default: 100 },
    },

    // Fee history entries allow past months to retain prior rates
    // Each entry applies from its effectiveMonth (YYYY-MM) onwards until superseded
    feeHistory: [
      {
        kind: { type: String, enum: [
          'garbage_regular_annual',
          'garbage_business_annual',
          'streetlight_monthly',
          'document_indigency',
          'document_clearance'
        ], required: true },
        value: { type: Number, required: true },
        effectiveMonth: { type: String, required: true }, // YYYY-MM
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now }
      }
    ],

    // Audit
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
);

// Ensure only a single settings document is used across the app
SettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

// Update allowed fields from a plain payload
SettingsSchema.statics.updateFromPayload = async function (payload = {}, userId = null) {
  const settings = await this.getSingleton();

  // Helper to format current month key
  const currentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Push history entry if value changed
  const pushHistory = (kind, oldVal, newVal) => {
    if (newVal !== undefined && Number(newVal) !== Number(oldVal)) {
      settings.feeHistory.push({
        kind,
        value: Number(newVal),
        effectiveMonth: currentMonthKey(),
        changedBy: userId || null,
      });
    }
  };

  const assignIfNumber = (obj, key, source, srcKey = key) => {
    if (Object.prototype.hasOwnProperty.call(source, srcKey)) {
      const val = Number(source[srcKey]);
      if (!Number.isNaN(val) && Number.isFinite(val) && val >= 0) {
        obj[key] = val;
      }
    }
  };

  // Capture old values for history comparison
  const oldRegular = settings.garbageFeeRegularAnnual;
  const oldBusiness = settings.garbageFeeBusinessAnnual;
  const oldStreetlight = settings.streetlightMonthlyFee;
  const oldIndigency = settings.documentFees?.indigency;
  const oldClearance = settings.documentFees?.barangayClearance;

  assignIfNumber(settings, 'garbageFeeRegularAnnual', payload);
  assignIfNumber(settings, 'garbageFeeBusinessAnnual', payload);
  assignIfNumber(settings, 'streetlightMonthlyFee', payload);

  if (payload.documentFees && typeof payload.documentFees === 'object') {
    settings.documentFees = settings.documentFees || {};
    assignIfNumber(settings.documentFees, 'indigency', payload.documentFees);
    assignIfNumber(settings.documentFees, 'barangayClearance', payload.documentFees);
  } else {
    // Also accept flat fields (indigencyFee, barangayClearanceFee)
    assignIfNumber(settings.documentFees || (settings.documentFees = {}), 'indigency', payload, 'indigencyFee');
    assignIfNumber(settings.documentFees, 'barangayClearance', payload, 'barangayClearanceFee');
  }

  // Record history after applying new values
  pushHistory('garbage_regular_annual', oldRegular, settings.garbageFeeRegularAnnual);
  pushHistory('garbage_business_annual', oldBusiness, settings.garbageFeeBusinessAnnual);
  pushHistory('streetlight_monthly', oldStreetlight, settings.streetlightMonthlyFee);
  pushHistory('document_indigency', oldIndigency, settings.documentFees?.indigency);
  pushHistory('document_clearance', oldClearance, settings.documentFees?.barangayClearance);

  if (userId) settings.updatedBy = userId;
  await settings.save();
  return settings.toObject();
};

// Helper to get effective fee value for a given kind and month (YYYY-MM)
SettingsSchema.statics.getEffectiveFee = async function (kind, monthKey) {
  const settings = await this.getSingleton();
  const targetMonth = monthKey || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  // Filter history entries applicable to month
  const candidates = (settings.feeHistory || []).filter(h => h.kind === kind && h.effectiveMonth <= targetMonth);
  // Sort by effectiveMonth descending to pick latest
  candidates.sort((a, b) => (a.effectiveMonth < b.effectiveMonth ? 1 : -1));
  if (candidates.length > 0) return candidates[0].value;

  // Fallback to current base values
  switch (kind) {
    case 'garbage_regular_annual': return settings.garbageFeeRegularAnnual;
    case 'garbage_business_annual': return settings.garbageFeeBusinessAnnual;
    case 'streetlight_monthly': return settings.streetlightMonthlyFee;
    case 'document_indigency': return settings.documentFees?.indigency || 0;
    case 'document_clearance': return settings.documentFees?.barangayClearance || 0;
    default: return 0;
  }
};

module.exports = mongoose.model('Settings', SettingsSchema);
