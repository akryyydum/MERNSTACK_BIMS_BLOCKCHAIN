/**
 * Script to check for email/mobile mismatches between User and Resident models
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Resident = require('../models/resident.model');
require('dotenv').config({ path: '../.env' });

async function checkEmailMismatches() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barangay_db');
    console.log('Connected to database\n');

    // Find all residents that have user links
    const residents = await Resident.find({ 
      user: { $exists: true, $ne: null } 
    }).populate('user');

    console.log(`Checking ${residents.length} residents with user accounts\n`);

    const mismatches = [];
    const noEmail = [];
    const matched = [];

    for (const resident of residents) {
      try {
        if (!resident.user) continue;

        const userId = typeof resident.user === 'object' ? resident.user._id : resident.user;
        const user = await User.findById(userId);

        if (!user) continue;

        const fullName = [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
          .filter(Boolean).join(' ');

        const residentEmail = resident.contact?.email?.toLowerCase()?.trim() || null;
        const userEmail = user.contact?.email?.toLowerCase()?.trim() || null;

        const residentMobile = resident.contact?.mobile?.trim() || null;
        const userMobile = user.contact?.mobile?.trim() || null;

        if (!residentEmail && !userEmail) {
          noEmail.push({
            name: fullName,
            username: user.username,
            residentId: resident._id
          });
        } else if (residentEmail !== userEmail || residentMobile !== userMobile) {
          mismatches.push({
            name: fullName,
            username: user.username,
            residentEmail,
            userEmail,
            residentMobile,
            userMobile,
            residentId: resident._id,
            userId: user._id
          });
        } else {
          matched.push({
            name: fullName,
            username: user.username,
            email: residentEmail
          });
        }
      } catch (err) {
        console.error(`Error checking resident ${resident._id}:`, err.message);
      }
    }

    // Print results
    console.log('=== MISMATCHES FOUND ===');
    if (mismatches.length > 0) {
      mismatches.forEach(m => {
        console.log(`\n❌ ${m.name} (@${m.username})`);
        if (m.residentEmail !== m.userEmail) {
          console.log(`   Email mismatch:`);
          console.log(`   - Resident: ${m.residentEmail || '(none)'}`);
          console.log(`   - User: ${m.userEmail || '(none)'}`);
        }
        if (m.residentMobile !== m.userMobile) {
          console.log(`   Mobile mismatch:`);
          console.log(`   - Resident: ${m.residentMobile || '(none)'}`);
          console.log(`   - User: ${m.userMobile || '(none)'}`);
        }
      });
      console.log(`\nTotal mismatches: ${mismatches.length}`);
    } else {
      console.log('✓ No mismatches found!');
    }

    console.log('\n=== ACCOUNTS WITHOUT EMAIL ===');
    if (noEmail.length > 0) {
      noEmail.forEach(n => {
        console.log(`⚠️  ${n.name} (@${n.username}) - No email on file`);
      });
      console.log(`\nTotal without email: ${noEmail.length}`);
    } else {
      console.log('✓ All accounts have email addresses!');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total residents checked: ${residents.length}`);
    console.log(`Matching records: ${matched.length}`);
    console.log(`Mismatches: ${mismatches.length}`);
    console.log(`No email: ${noEmail.length}`);

    if (mismatches.length > 0) {
      console.log('\n💡 Run sync-emails.js to fix mismatches automatically');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
checkEmailMismatches();
