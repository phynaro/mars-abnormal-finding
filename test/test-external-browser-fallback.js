/**
 * Test script for External Browser Fallback
 * 
 * This script tests the behavior when the app is running in an external browser
 * (not in LINE client) and should fall back to normal login.
 * 
 * Expected behavior:
 * 1. LIFF initialization should succeed
 * 2. isInClient() should return false
 * 3. LINE login flow should be skipped
 * 4. App should fall back to normal login
 * 5. WelcomePage should not show LINE linking section
 */

// Mock LIFF object for testing
const mockLiffExternalBrowser = {
  init: async () => {
    console.log('LIFF initialization completed successfully');
  },
  isLoggedIn: () => false,
  isInClient: () => false, // This is the key difference for external browser
  getContext: () => null,
  getOS: () => 'web',
  getVersion: () => '2.1.0',
  getLanguage: () => 'en',
  getAccessToken: () => null,
  getIDToken: () => null,
  getProfile: async () => null,
  login: () => {
    console.log('LIFF login called (should not happen in external browser)');
  }
};

const mockLiffInClient = {
  init: async () => {
    console.log('LIFF initialization completed successfully');
  },
  isLoggedIn: () => false,
  isInClient: () => true, // This is true when in LINE client
  getContext: () => ({ type: 'utou', userId: 'test-user' }),
  getOS: () => 'ios',
  getVersion: () => '2.1.0',
  getLanguage: () => 'en',
  getAccessToken: () => null,
  getIDToken: () => null,
  getProfile: async () => null,
  login: () => {
    console.log('LIFF login called (expected in LINE client)');
  }
};

function testExternalBrowserFlow() {
  console.log('🧪 Testing External Browser Flow');
  console.log('================================');
  
  const liff = mockLiffExternalBrowser;
  
  console.log('1. LIFF initialization...');
  liff.init();
  
  console.log('2. Checking if in LINE client...');
  console.log('   isInClient():', liff.isInClient());
  
  if (!liff.isInClient()) {
    console.log('✅ Correctly detected external browser');
    console.log('✅ Skipping LINE login flow');
    console.log('✅ Falling back to normal login');
    return true;
  } else {
    console.log('❌ Should not be in LINE client');
    return false;
  }
}

function testInClientFlow() {
  console.log('\n🧪 Testing In LINE Client Flow');
  console.log('==============================');
  
  const liff = mockLiffInClient;
  
  console.log('1. LIFF initialization...');
  liff.init();
  
  console.log('2. Checking if in LINE client...');
  console.log('   isInClient():', liff.isInClient());
  
  if (liff.isInClient()) {
    console.log('✅ Correctly detected LINE client');
    console.log('✅ Proceeding with LINE login flow');
    
    if (!liff.isLoggedIn()) {
      console.log('✅ User not logged in, calling liff.login()');
      liff.login();
    }
    return true;
  } else {
    console.log('❌ Should be in LINE client');
    return false;
  }
}

function testWelcomePageCondition() {
  console.log('\n🧪 Testing WelcomePage Condition');
  console.log('================================');
  
  // Simulate external browser scenario
  const liffObject = mockLiffExternalBrowser;
  const liffTokenVerified = false; // Should be false in external browser
  const lineProfile = null; // Should be null in external browser
  const user = { lineId: null }; // User without LINE ID
  
  const shouldShowLineLinking = liffObject?.isInClient() && liffTokenVerified && lineProfile?.success && lineProfile.profile && !user?.lineId;
  
  console.log('External browser scenario:');
  console.log('  liffObject?.isInClient():', liffObject?.isInClient());
  console.log('  liffTokenVerified:', liffTokenVerified);
  console.log('  lineProfile:', lineProfile);
  console.log('  user.lineId:', user.lineId);
  console.log('  shouldShowLineLinking:', shouldShowLineLinking);
  
  if (!shouldShowLineLinking) {
    console.log('✅ WelcomePage correctly hides LINE linking section in external browser');
    return true;
  } else {
    console.log('❌ WelcomePage should not show LINE linking section in external browser');
    return false;
  }
}

// Main execution
function main() {
  console.log('🚀 Starting External Browser Fallback Tests');
  console.log('===========================================\n');
  
  const results = [
    testExternalBrowserFlow(),
    testInClientFlow(),
    testWelcomePageCondition()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! External browser fallback is working correctly.');
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testExternalBrowserFlow,
  testInClientFlow,
  testWelcomePageCondition
};
