/**
 * Test script to verify email validation
 * This tests that the sendEmail function properly rejects invalid emails
 */

const sendEmail = require('../utils/sendEmail');

async function testEmailValidation() {
  console.log('Testing Email Validation...\n');
  
  const testCases = [
    { email: null, shouldFail: true, description: 'null email' },
    { email: undefined, shouldFail: true, description: 'undefined email' },
    { email: '', shouldFail: true, description: 'empty string' },
    { email: '   ', shouldFail: true, description: 'whitespace only' },
    { email: 'invalid', shouldFail: true, description: 'no @ symbol' },
    { email: 'invalid@', shouldFail: true, description: 'no domain' },
    { email: '@domain.com', shouldFail: true, description: 'no local part' },
    { email: 'test@domain', shouldFail: true, description: 'no TLD' },
    { email: 'test@domain.com', shouldFail: false, description: 'valid email' },
    { email: '  test@domain.com  ', shouldFail: false, description: 'valid email with spaces' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      // Note: This will attempt to send a real email, so comment out the actual send in production testing
      // For testing purposes, we're only validating the validation logic
      await sendEmail(testCase.email, 'Test Subject', 'Test Body');
      
      if (testCase.shouldFail) {
        console.log(`❌ FAIL: ${testCase.description} - Should have failed but passed`);
        failed++;
      } else {
        console.log(`✓ PASS: ${testCase.description} - Validation passed (email would be sent)`);
        passed++;
      }
    } catch (error) {
      if (testCase.shouldFail) {
        console.log(`✓ PASS: ${testCase.description} - Correctly rejected with: ${error.message}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${testCase.description} - Should have passed but failed with: ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n=== Test Results ===`);
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests
console.log('Email Validation Test Suite');
console.log('===========================\n');
testEmailValidation().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
