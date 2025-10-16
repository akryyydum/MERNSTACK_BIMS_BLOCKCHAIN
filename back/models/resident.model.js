const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // was required: true
    firstName: { type: String, required: true },
    middleName: { type: String, required: false },
    lastName: { type: String, required: true },
    suffix: { type: String, required: false },
    dateOfBirth: { type: Date, required: true },
    birthPlace: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    civilStatus: { type: String, enum: ['single', 'married', 'widowed', 'separated'], required: true },
    religion: { type: String, required: false },
    ethnicity: { type: String, required: true },
    address: {
        purok: { type: String, required: true, enum: ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5'] },
        barangay: { type: String, required: true },
        municipality: { type: String, required: true },
        province: { type: String, required: true },
        zipCode: { type: String, required: false }
    },
    citizenship: { type: String, required: true },
    occupation: { type: String, required: true },
    education: { type: String, required: true },
    contact: {
        mobile: { type: String, required: false },
        email: { type: String, required: false }
    },

idFiles: [{ type: String, required: false }],  

blockchain: {
    hash: String,  // Hash of the resident's data for blockchain verification
    lastTxId: String, 
    createdBy: String,
    VerifiedBy: String, 
    verifiedAt: Date 
},
status: { type: String, enum: ['verified', 'rejected', 'pending'], default: 'pending' },
createdAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
});
// Ensure uniqueness only when user is set
residentSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Resident', residentSchema);
