const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String, required: false },
    lastName: { type: String, required: true },
    suffix: { type: String, required: false },
    dateOfBirth: { type: Date, required: true },
    birthPlace: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    civilStatus: { type: String, enum: ['single', 'married', 'widowed', 'separated'], required: true },
    religion: { type: String, required: false },
    address: {
        street: { type: String, required: true },
        barangay: { type: String, required: true },
        municipality: { type: String, required: true },
        province: { type: String, required: true },
        zipCode: { type: String, required: false }
    },
    citizenship: { type: String, required: true },
    occupation: { type: String, required: true },
    education: { type: String, required: true },
    contact: {
        mobile: { type: String, required: true },
        email: { type: String, required: true }
    },

idFiles: [{ type: String, required: false }],  

blockchain: {
    hash: String,  // Hash of the resident's data for blockchain verification
    lastTxId: String,  // Last transaction ID for blockchain updates
    createdBy: String,  // User ID of the creator
    VerifiedBy: String,  // User ID of the verifier
    verifiedAt: Date  // Timestamp of verification
},
status: { type: String, enum: ['verified', 'rejected', 'pending'], default: 'pending' },
createdAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Resident', residentSchema);
