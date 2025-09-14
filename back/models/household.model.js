const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    purok: { type: String, required: true, enum: ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5'] },
    barangay: { type: String, required: true },
    municipality: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: { type: String },
  },
  { _id: false }
);

const GarbageFeeSchema = new mongoose.Schema(
  {
    currentMonthCharge: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    lastPaymentDate: { type: Date, default: null },
  },
  { _id: false }
);

const HouseholdSchema = new mongoose.Schema(
  {
    householdId: { type: String, required: true, unique: true },
    headOfHousehold: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true }],
    address: { type: AddressSchema, required: true },
    garbageFee: { type: GarbageFeeSchema, default: {} },
    electricFee: { type: GarbageFeeSchema, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Household', HouseholdSchema);