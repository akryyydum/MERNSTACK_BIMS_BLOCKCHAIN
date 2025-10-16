const mongoose = require("mongoose");

const PaymentEntrySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String },
    reference: { type: String },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StreetlightPaymentSchema = new mongoose.Schema(
  {
    household: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    totalCharge: { type: Number, required: true, min: 0, default: 10 }, // PHP 10 per month
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    balance: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
    payments: { type: [PaymentEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Each household has at most one summary per month
StreetlightPaymentSchema.index({ household: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("StreetlightPayment", StreetlightPaymentSchema);