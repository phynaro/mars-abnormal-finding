/**
 * Test script to verify LIFF integration
 * This script tests the LIFF initialization flow
 */

// Test LIFF initialization
console.log('Testing LIFF Integration...');

// Check if LIFF ID is available
const liffId = import.meta.env.VITE_LIFF_ID;
console.log('LIFF ID:', liffId ? 'Available' : 'Missing');

// Test LIFF import
try {
  const liff = await import('@line/liff');
  console.log('LIFF module imported successfully');
  
  // Test LIFF initialization (this would normally be done in AuthContext)
  if (liffId) {
    try {
      await liff.default.init({ liffId });
      console.log('LIFF initialization successful');
      console.log('LIFF is logged in:', liff.default.isLoggedIn());
      console.log('LIFF context:', liff.default.getContext());
    } catch (error) {
      console.error('LIFF initialization failed:', error);
    }
  } else {
    console.warn('LIFF ID not found in environment variables');
  }
} catch (error) {
  console.error('Failed to import LIFF module:', error);
}

console.log('LIFF integration test completed');

