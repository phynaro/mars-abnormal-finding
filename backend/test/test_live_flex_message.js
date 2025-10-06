#!/usr/bin/env node

/**
 * Test the new flex service with a real LINE message
 * Usage: node test_live_flex_message.js
 */

require('dotenv').config();
const abnFlexService = require('../src/services/abnormalFindingFlexService');

async function testLiveMessage() {
  console.log('🧪 Testing Live LINE Flex Message');
  console.log('='.repeat(40));

  // Test LINE user ID (replace with your actual LINE ID)
  const testLineUserId = "U436b7c116495adcbc4096d51b28abad8"; // Your LINE ID from previous tests

  // Test payload based on real ticket data
  const testPayload = {
    caseNo: "TKT-20250921-001",
    assetName: "DJ - Receiving",
    problem: "Motor overheating - requires immediate attention",
    actionBy: "Karun C.",
    comment: "งานทดสอบระบบใหม่ - ข้อความนี้ส่งจากระบบ Flex Message แบบใหม่",
    extraKVs: [
      { label: "Priority", value: "High" },
      { label: "Date Time", value: new Date().toLocaleString('th-TH') }
    ],
    detailUrl: "http://localhost:3000/tickets/31"
  };

  try {
    console.log('📱 Building ACCEPTED state message...');
    const flexMsg = abnFlexService.buildAbnFlexMinimal(
      abnFlexService.AbnCaseState.ACCEPTED,
      testPayload
    );

    console.log(`✅ Message built: ${flexMsg.altText}`);
    console.log('📤 Sending to LINE...');

    const result = await abnFlexService.pushToUser(testLineUserId, flexMsg);
    
    if (result.success) {
      console.log('🎉 SUCCESS! Message sent to LINE');
      console.log(`📊 Status: ${result.status}`);
    } else if (result.skipped) {
      console.log('⚠️  Message skipped (no LINE token configured)');
    } else {
      console.log('❌ Failed to send message');
      console.log(`💥 Error: ${result.error}`);
    }

    // Test different states
    console.log('\n🔄 Testing different states...');
    const states = [
      { state: abnFlexService.AbnCaseState.CREATED, comment: "เคสใหม่ - ทดสอบสถานะ CREATED" },
      { state: abnFlexService.AbnCaseState.Finished, comment: "งานเสร็จสิ้น - ทดสอบสถานะ Finished" },
      { state: abnFlexService.AbnCaseState.ESCALATED, comment: "ส่งต่อ L3 - ทดสอบสถานะ ESCALATED" }
    ];

    for (const { state, comment } of states) {
      const statePayload = { ...testPayload, comment, caseNo: `TKT-TEST-${state}` };
      const stateMsg = abnFlexService.buildAbnFlexMinimal(state, statePayload);
      
      console.log(`📤 Sending ${state} message...`);
      const stateResult = await abnFlexService.pushToUser(testLineUserId, stateMsg);
      
      if (stateResult.success) {
        console.log(`✅ ${state} message sent successfully`);
      } else {
        console.log(`❌ ${state} message failed: ${stateResult.error || 'Unknown error'}`);
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  }
}

// Show configuration
console.log('🔧 Configuration:');
console.log(`   LINE Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
console.log();

testLiveMessage().then(() => {
  console.log('\n🏁 Test Finished');
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});
