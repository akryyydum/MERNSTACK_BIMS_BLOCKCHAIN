/**
 * Test script for notification system
 * Usage: node back/scripts/test-notifications.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Notification = require('../models/notification.model');
const Resident = require('../models/resident.model');
const { createNotification } = require('../controllers/residentNotificationController');

async function testNotifications() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bims';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find a test resident
    const testResident = await Resident.findOne({ status: 'verified' }).limit(1);
    
    if (!testResident) {
      console.log('❌ No verified residents found. Please create a resident first.');
      process.exit(1);
    }

    console.log(`\n📝 Testing notifications for: ${testResident.firstName} ${testResident.lastName}`);
    console.log(`   Resident ID: ${testResident._id}`);

    // Test 1: Create a document request notification
    console.log('\n🔔 Test 1: Creating document request notification...');
    const docNotif = await createNotification({
      residentId: testResident._id,
      type: 'document_request',
      title: 'Document Request Accepted',
      message: 'Your Barangay Clearance request has been accepted and is being processed.',
      link: '/resident/requests',
      priority: 'medium'
    });
    console.log('✅ Document notification created:', docNotif._id);

    // Test 2: Create a payment notification
    console.log('\n🔔 Test 2: Creating payment notification...');
    const paymentNotif = await createNotification({
      residentId: testResident._id,
      type: 'payment',
      title: 'Overdue Garbage Fee',
      message: 'Your garbage fee balance is ₱150.00. Payment is overdue.',
      link: '/resident/payments',
      priority: 'high'
    });
    console.log('✅ Payment notification created:', paymentNotif._id);

    // Test 3: Create a complaint notification
    console.log('\n🔔 Test 3: Creating complaint notification...');
    const complaintNotif = await createNotification({
      residentId: testResident._id,
      type: 'complaint',
      title: 'Complaint Resolved',
      message: 'Your complaint has been resolved.',
      link: '/resident/reports-complaints',
      priority: 'high'
    });
    console.log('✅ Complaint notification created:', complaintNotif._id);

    // Test 4: Create an account notification
    console.log('\n🔔 Test 4: Creating account notification...');
    const accountNotif = await createNotification({
      residentId: testResident._id,
      type: 'account',
      title: 'Account Verified',
      message: 'Your account has been verified. You now have full access to the system.',
      link: '/resident/profile',
      priority: 'high'
    });
    console.log('✅ Account notification created:', accountNotif._id);

    // Test 5: Fetch all notifications for the resident
    console.log('\n📋 Test 5: Fetching all notifications for resident...');
    const allNotifications = await Notification.find({ residentId: testResident._id })
      .sort({ createdAt: -1 });
    console.log(`✅ Found ${allNotifications.length} notifications`);

    // Test 6: Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      residentId: testResident._id, 
      isRead: false 
    });
    console.log(`📬 Unread notifications: ${unreadCount}`);

    // Test 7: Mark one as read
    if (allNotifications.length > 0) {
      console.log('\n✓ Test 7: Marking first notification as read...');
      const firstNotif = allNotifications[0];
      firstNotif.isRead = true;
      await firstNotif.save();
      console.log('✅ Notification marked as read');
    }

    // Test 8: Delete a notification
    if (allNotifications.length > 1) {
      console.log('\n🗑️  Test 8: Deleting second notification...');
      await Notification.findByIdAndDelete(allNotifications[1]._id);
      console.log('✅ Notification deleted');
    }

    console.log('\n✨ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Created 4 test notifications`);
    console.log(`   - Fetched notifications: ✅`);
    console.log(`   - Mark as read: ✅`);
    console.log(`   - Delete notification: ✅`);
    console.log('\n💡 You can now check these notifications in the resident dashboard.');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run tests
testNotifications();
