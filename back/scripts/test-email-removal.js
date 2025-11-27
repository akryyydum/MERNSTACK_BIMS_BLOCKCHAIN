/**
 * Test script to verify email removal behavior
 * This simulates removing email and checking if OTP request fails properly
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Resident = require('../models/resident.model');
require('dotenv').config({ path: '../.env' });

async function testEmailRemoval() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barangay_db');
    console.log('Connected to database\n');

    // Get all users with emails
    const users = await User.find({ 
      'contact.email': { $exists: true, $ne: null } 
    }).select('username fullName role contact').lean();

    if (users.length === 0) {
      console.log('❌ No users with emails found in database.');
      console.log('💡 Create a test user with email first, then run this script.');
      return;
    }

    console.log(`Found ${users.length} users with emails:\n`);
    
    for (const user of users) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`👤 Testing: ${user.username} (${user.role})`);
      console.log(`   User Model Email: ${user.contact?.email || 'NONE'}`);
      
      // Check resident
      if (user.role === 'resident' || user.role === 'official') {
        const resident = await Resident.findOne({ user: user._id })
          .select('firstName lastName contact')
          .lean();
        
        if (resident) {
          console.log(`   Resident Model Email: ${resident.contact?.email || 'NONE'}`);
          
          // Test what OTP system will see
          let otpEmail = user.contact?.email;
          let otpSource = 'User model';
          
          if (resident?.contact?.email) {
            otpEmail = resident.contact.email;
            otpSource = 'Resident model (priority)';
          }
          
          console.log(`\n   🔐 OTP System Behavior:`);
          if (otpEmail) {
            console.log(`   ✅ WILL SEND OTP to: ${otpEmail}`);
            console.log(`   📧 Email source: ${otpSource}`);
          } else {
            console.log(`   ❌ WILL REJECT OTP REQUEST`);
            console.log(`   💬 Error: "No email on file. Please contact your admin."`);
          }
          
          // Check for sync issues
          const userEmail = user.contact?.email?.toLowerCase()?.trim();
          const residentEmail = resident.contact?.email?.toLowerCase()?.trim();
          
          if (userEmail !== residentEmail) {
            console.log(`\n   ⚠️  SYNC ISSUE DETECTED!`);
            console.log(`   User has: ${userEmail || '(none)'}`);
            console.log(`   Resident has: ${residentEmail || '(none)'}`);
            console.log(`   → This can cause OTP to work even after email "removed" from resident`);
            console.log(`   → Run sync-emails.js or manually remove from User model`);
          } else if (!userEmail && !residentEmail) {
            console.log(`\n   ✅ Correctly synced: No email in either model`);
            console.log(`   → OTP will properly fail`);
          } else {
            console.log(`\n   ✅ Correctly synced: Email exists in both models`);
          }
        } else {
          console.log(`   ⚠️  No resident record (unlinked user)`);
          if (user.contact?.email) {
            console.log(`\n   🔐 OTP System Behavior:`);
            console.log(`   ✅ WILL SEND OTP to: ${user.contact.email}`);
            console.log(`   📧 Email source: User model only`);
          }
        }
      } else {
        // Admin user
        console.log(`\n   🔐 OTP System Behavior:`);
        if (user.contact?.email) {
          console.log(`   ✅ WILL SEND OTP to: ${user.contact.email}`);
          console.log(`   📧 Email source: User model`);
        } else {
          console.log(`   ❌ WILL REJECT OTP REQUEST`);
          console.log(`   💬 Error: "No email on file"`);
        }
      }
    }
    
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    
    // Check for any sync issues
    const residents = await Resident.find({ 
      user: { $exists: true, $ne: null } 
    }).populate('user', 'contact').lean();
    
    let syncIssues = 0;
    let noEmailBoth = 0;
    let hasEmailBoth = 0;
    
    for (const resident of residents) {
      if (!resident.user) continue;
      
      const userEmail = resident.user.contact?.email?.toLowerCase()?.trim() || null;
      const residentEmail = resident.contact?.email?.toLowerCase()?.trim() || null;
      
      if (userEmail !== residentEmail) {
        syncIssues++;
      } else if (!userEmail && !residentEmail) {
        noEmailBoth++;
      } else {
        hasEmailBoth++;
      }
    }
    
    console.log(`\nTotal users checked: ${users.length}`);
    console.log(`Resident accounts: ${residents.length}`);
    console.log(`\n📊 Email Sync Status:`);
    console.log(`  ✅ Properly synced (have email): ${hasEmailBoth}`);
    console.log(`  ✅ Properly synced (no email): ${noEmailBoth}`);
    console.log(`  ⚠️  Sync issues found: ${syncIssues}`);
    
    if (syncIssues > 0) {
      console.log(`\n⚠️  WARNING: ${syncIssues} account(s) have sync issues!`);
      console.log(`   This means OTP might work even after removing email from resident.`);
      console.log(`\n💡 Fix by running: node back/scripts/sync-emails.js`);
    } else {
      console.log(`\n✅ All accounts are properly synced!`);
      console.log(`   Email removal from resident will prevent OTP as expected.`);
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('🧪 TEST INSTRUCTIONS');
    console.log('='.repeat(80));
    console.log(`\nTo test email removal behavior:`);
    console.log(`1. Pick a user from above list`);
    console.log(`2. Remove email via UI (Admin Resident Management or Profile)`);
    console.log(`3. Check server logs for: [SYNC] Removing email from User model`);
    console.log(`4. Run this script again to verify email removed from both models`);
    console.log(`5. Try OTP request - should fail with "No email on file"`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
testEmailRemoval();
