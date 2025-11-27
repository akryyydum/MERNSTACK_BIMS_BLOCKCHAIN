/**
 * Script to sync email and mobile from Resident to User models
 * This ensures all user accounts have the latest contact info from their resident records
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Resident = require('../models/resident.model');
require('dotenv').config({ path: '../.env' });

async function syncEmails() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barangay_db');
    console.log('Connected to database');

    // Find all residents that have user links
    const residents = await Resident.find({ 
      user: { $exists: true, $ne: null } 
    }).populate('user');

    console.log(`Found ${residents.length} residents with user accounts`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const resident of residents) {
      try {
        if (!resident.user) {
          console.log(`Skipping resident ${resident._id} - no user linked`);
          continue;
        }

        const userId = typeof resident.user === 'object' ? resident.user._id : resident.user;
        const user = await User.findById(userId);

        if (!user) {
          console.log(`Skipping resident ${resident._id} - user not found`);
          continue;
        }

        const updates = {};
        const unsets = {};
        let needsUpdate = false;

        // Check email
        const residentEmail = resident.contact?.email?.toLowerCase()?.trim() || null;
        const userEmail = user.contact?.email?.toLowerCase()?.trim() || null;

        if (residentEmail !== userEmail) {
          if (residentEmail) {
            updates['contact.email'] = residentEmail;
            needsUpdate = true;
            console.log(`Will sync email for ${resident.firstName} ${resident.lastName}: ${residentEmail}`);
          } else if (userEmail) {
            unsets['contact.email'] = '';
            needsUpdate = true;
            console.log(`Will remove email for ${resident.firstName} ${resident.lastName}`);
          }
        }

        // Check mobile
        const residentMobile = resident.contact?.mobile?.trim() || null;
        const userMobile = user.contact?.mobile?.trim() || null;

        if (residentMobile !== userMobile) {
          if (residentMobile) {
            updates['contact.mobile'] = residentMobile;
            needsUpdate = true;
            console.log(`Will sync mobile for ${resident.firstName} ${resident.lastName}: ${residentMobile}`);
          } else if (userMobile) {
            unsets['contact.mobile'] = '';
            needsUpdate = true;
            console.log(`Will remove mobile for ${resident.firstName} ${resident.lastName}`);
          }
        }

        // Apply updates
        if (needsUpdate) {
          const updateOps = {};
          if (Object.keys(updates).length > 0) updateOps.$set = updates;
          if (Object.keys(unsets).length > 0) updateOps.$unset = unsets;

          await User.findByIdAndUpdate(userId, updateOps);
          syncedCount++;
          console.log(`✓ Synced contact info for ${resident.firstName} ${resident.lastName}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error syncing resident ${resident._id}:`, err.message);
      }
    }

    console.log('\n=== Sync Complete ===');
    console.log(`Total residents checked: ${residents.length}`);
    console.log(`Successfully synced: ${syncedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`No changes needed: ${residents.length - syncedCount - errorCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
syncEmails();
