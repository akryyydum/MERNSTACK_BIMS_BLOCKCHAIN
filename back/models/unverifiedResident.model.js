const mongoose = require('mongoose');

// Stores registration attempts for residents not found in canonical Resident collection
// When approved by admin, data is migrated into Resident model and this document deleted.
const unverifiedResidentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  suffix: { type: String },
  dateOfBirth: { type: Date, required: true },
  birthPlace: { type: String, required: true },
  sex: { type: String, enum: ['male','female','other','Male','Female','Other'], required: true },
  civilStatus: { type: String, enum: ['single','married','widowed','separated','Single','Married','Widowed','Separated','Divorced'], required: true },
  religion: { type: String },
  ethnicity: { type: String },
  address: {
    purok: { type: String, enum: ['Purok 1','Purok 2','Purok 3','Purok 4','Purok 5'], required: true },
    barangay: { type: String, required: true },
    municipality: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: { type: String }
  },
  citizenship: { type: String, required: true },
  occupation: { type: String, required: true },
  sectoralInformation: { type: String },
  employmentStatus: { type: String },
  registeredVoter: { type: Boolean, default: false },
  contact: {
    mobile: { type: String },
    email: { type: String }
  },
  idFiles: [{ type: String }],
  notes: { type: String }, // optional admin notes
  status: { type: String, enum: ['pending','rejected'], default: 'pending' }, // unverified lifecycle
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

unverifiedResidentSchema.index({ user: 1 }, { unique: true });
unverifiedResidentSchema.index({ firstName: 1, lastName: 1, dateOfBirth: 1 });

module.exports = mongoose.model('UnverifiedResident', unverifiedResidentSchema);
