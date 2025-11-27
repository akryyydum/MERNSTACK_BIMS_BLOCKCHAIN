/**
 * Script to check users and their emails for OTP debugging
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Resident = require('../models/resident.model');
require('dotenv').config({ path: '../.env' });

async function checkUserEmails() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barangay_db');
    console.log('Connected to database\n');

    // Get all users
    const users = await User.find({}).select('username fullName role contact').lean();
    
    console.log(`Found ${users.length} users in database\n`);
    console.log('='.repeat(80));
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.username} (${user.fullName || 'No name'})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User Model Email: ${user.contact?.email || '❌ NO EMAIL'}`);
      console.log(`   User Model Mobile: ${user.contact?.mobile || '❌ NO MOBILE'}`);
      
      // If resident or official, check resident model
      if (user.role === 'resident' || user.role === 'official') {
        const resident = await Resident.findOne({ user: user._id })
          .select('firstName lastName contact')
          .lean();
        
        if (resident) {
          console.log(`   Resident Model Email: ${resident.contact?.email || '❌ NO EMAIL'}`);
          console.log(`   Resident Model Mobile: ${resident.contact?.mobile || '❌ NO MOBILE'}`);
          
          // Check for mismatches
          const userEmail = user.contact?.email?.toLowerCase()?.trim() || null;
          const residentEmail = resident.contact?.email?.toLowerCase()?.trim() || null;
          
          if (userEmail !== residentEmail) {
            console.log(`   ⚠️  EMAIL MISMATCH!`);
            console.log(`      User has: ${userEmail || '(none)'}`);
            console.log(`      Resident has: ${residentEmail || '(none)'}`);
            console.log(`      → OTP will use: ${residentEmail || userEmail || '(none)'}`);
          } else if (residentEmail) {
            console.log(`   ✅ Email synced correctly: ${residentEmail}`);
          } else {
            console.log(`   ❌ NO EMAIL IN EITHER MODEL - OTP WILL FAIL!`);
          }
        } else {
          console.log(`   ⚠️  No resident record found (unlinked user)`);
          if (user.contact?.email) {
            console.log(`   → OTP will use User email: ${user.contact.email}`);
          } else {
            console.log(`   ❌ NO EMAIL - OTP WILL FAIL!`);
          }
        }
      } else {
        // Admin users
        if (user.contact?.email) {
          console.log(`   ✅ Has email - OTP will work`);
        } else {
          console.log(`   ❌ NO EMAIL - OTP WILL FAIL!`);
        }
      }
      
      console.log('-'.repeat(80));
    }
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    
    const usersWithEmail = users.filter(u => u.contact?.email).length;
    const usersWithoutEmail = users.length - usersWithEmail;
    
    // Check residents
    const residents = await Resident.find({ 
      user: { $exists: true, $ne: null } 
    }).populate('user', 'username role contact').lean();
    
    const residentsWithEmail = residents.filter(r => r.contact?.email).length;
    const residentsWithoutEmail = residents.length - residentsWithEmail;
    
    console.log(`\nUsers in database: ${users.length}`);
    console.log(`  - Users with email in User model: ${usersWithEmail}`);
    console.log(`  - Users without email in User model: ${usersWithoutEmail}`);
    
    console.log(`\nResidents linked to users: ${residents.length}`);
    console.log(`  - Residents with email in Resident model: ${residentsWithEmail}`);
    console.log(`  - Residents without email in Resident model: ${residentsWithoutEmail}`);
    
    // OTP readiness
    let otpReady = 0;
    let otpFail = 0;
    
    for (const user of users) {
      let hasEmail = user.contact?.email;
      
      if (user.role === 'resident' || user.role === 'official') {
        const resident = await Resident.findOne({ user: user._id }).select('contact').lean();
        if (resident?.contact?.email) {
          hasEmail = true;
        }
      }
      
      if (hasEmail) {
        otpReady++;
      } else {
        otpFail++;
      }
    }
    
    console.log(`\n🔐 OTP Readiness:`);
    console.log(`  ✅ Users ready for OTP: ${otpReady}`);
    console.log(`  ❌ Users that will fail OTP: ${otpFail}`);
    
    if (otpFail > 0) {
      console.log(`\n💡 To fix: Run sync-emails.js or manually add emails to these users`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
checkUserEmails();
