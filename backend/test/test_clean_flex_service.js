#!/usr/bin/env node

/**
 * Test script for the new clean Abnormal Finding Flex Service
 * This demonstrates the simple usage pattern from flexmessge-design.md
 */

const abnFlexService = require('../src/services/abnormalFindingFlexService');

console.log('🧪 Testing Clean Abnormal Finding Flex Service');
console.log('='.repeat(50));

// Test data payload (following the design doc example)
const testPayload = {
  caseNo: "TKT-20250921-001",
  assetName: "DJ - Receiving",
  problem: "Motor overheating",
  actionBy: "Karun C.",
  comment: "งานได้รับการยอมรับแล้ว จะเริ่มดำเนินการต่อไป",
  callUri: "tel:+66812345678",
  detailUrl: "http://localhost:3000/tickets/31"
};

// Test building different message states
const testStates = [
  { state: abnFlexService.AbnCaseState.CREATED, extraData: { comment: "เคสใหม่ รอการยอมรับจาก L2" } },
  { state: abnFlexService.AbnCaseState.ACCEPTED, extraData: { comment: "งานได้รับการยอมรับแล้ว" } },
  { state: abnFlexService.AbnCaseState.COMPLETED, extraData: { comment: "งานเสร็จสมบูรณ์แล้ว" } },
  { state: abnFlexService.AbnCaseState.REJECT_FINAL, extraData: { comment: "งานถูกปฏิเสธ" } }
];

testStates.forEach(({ state, extraData }) => {
  console.log(`\n📱 Testing state: ${state}`);
  console.log(`📋 Status Label: ${abnFlexService.stateLabels[state]}`);
  console.log(`🎨 Status Color: ${abnFlexService.stateColorMap[state]}`);
  
  try {
    const payload = { ...testPayload, ...extraData };
    const flexMsg = abnFlexService.buildAbnFlexMinimal(state, payload);
    
    console.log(`✅ Message built successfully`);
    console.log(`📝 Alt Text: ${flexMsg.altText}`);
    console.log(`🔧 Message Type: ${flexMsg.type}`);
    
    // Show a snippet of the flex structure
    const bubble = flexMsg.contents;
    const statusText = bubble.body.contents[0].text;
    const caseNoText = bubble.body.contents[1].text;
    const assetText = bubble.body.contents[2].text;
    
    console.log(`   Status: ${statusText}`);
    console.log(`   Case No: ${caseNoText}`);
    console.log(`   Asset: ${assetText}`);
    
  } catch (error) {
    console.error(`❌ Error building message for ${state}:`, error.message);
  }
});

// Test with minimal payload
console.log('\n🔬 Testing with minimal payload...');
try {
  const minimalPayload = {
    caseNo: "TKT-20250921-002",
    assetName: "Test Asset"
  };
  
  const flexMsg = abnFlexService.buildAbnFlexMinimal(
    abnFlexService.AbnCaseState.CREATED, 
    minimalPayload
  );
  
  console.log('✅ Minimal payload test passed');
  console.log(`📝 Alt Text: ${flexMsg.altText}`);
} catch (error) {
  console.error('❌ Minimal payload test failed:', error.message);
}

// Test with extra key-value pairs
console.log('\n🎯 Testing with extra key-value pairs...');
try {
  const extendedPayload = {
    ...testPayload,
    extraKVs: [
      { label: "Priority", value: "High" },
      { label: "Scheduled Complete", value: "22/9/2568 14:30" },
      { label: "Cost Avoidance", value: "50,000 บาท" }
    ]
  };
  
  const flexMsg = abnFlexService.buildAbnFlexMinimal(
    abnFlexService.AbnCaseState.ESCALATED, 
    extendedPayload
  );
  
  console.log('✅ Extended payload test passed');
  console.log(`📝 Alt Text: ${flexMsg.altText}`);
} catch (error) {
  console.error('❌ Extended payload test failed:', error.message);
}

console.log('\n🎉 All tests completed!');
console.log('\n📚 Usage in Ticket Controller:');
console.log(`
const abnFlexService = require('../services/abnormalFindingFlexService');

// In your notification function:
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, {
  caseNo: ticket.ticket_number,
  assetName: ticket.PUNAME || "Unknown Asset",
  problem: ticket.title,
  actionBy: userFullName,
  comment: "งานได้รับการยอมรับแล้ว",
  detailUrl: \`\${process.env.FRONTEND_URL}/tickets/\${ticket.id}\`
});

await abnFlexService.pushToUser(lineUserId, flexMsg);
`);

console.log('\n🎨 Available States:');
Object.values(abnFlexService.AbnCaseState).forEach(state => {
  console.log(`  - ${state}: ${abnFlexService.stateLabels[state]} (${abnFlexService.stateColorMap[state]})`);
});
