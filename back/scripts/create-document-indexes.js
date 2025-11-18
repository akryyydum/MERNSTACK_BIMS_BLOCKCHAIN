const mongoose = require('mongoose');
const DocumentRequest = require('../models/document.model');
require('dotenv').config();

async function createIndexes() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/barangay_bims';
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB');

    console.log('Creating document request indexes...');
    await DocumentRequest.init(); // This will create indexes defined in schema
    await DocumentRequest.syncIndexes(); // Ensure indexes are synced
    
    const indexes = await DocumentRequest.collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    console.log('✅ Document request indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
