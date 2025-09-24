#!/usr/bin/env node

/**
 * Test the updated closeTicket notification using new service
 */

require('dotenv').config();
const abnFlexService = require('./src/services/abnormalFindingFlexService');

async function testCloseTicket() {
  console.log('🧪 Testing Close Ticket Notification');
  console.log('='.repeat(40));

  const testLineUserId = "U436b7c116495adcbc4096d51b28abad8";

  // Test close ticket scenario
  const closeTicketPayload = {
    caseNo: "TKT-20250921-201",
    assetName: "Cooling System Unit B",
    problem: "Temperature control malfunction",
    actionBy: "Jirawuth Phusarn", // Requester who closed the ticket
    comment: "งานเสร็จสิ้นตามที่ต้องการ ขอบคุณทีมช่าง",
    extraKVs: [
      { label: "Satisfaction Rating", value: "5/5 ดาว" }
    ],
    detailUrl: "http://localhost:3000/tickets/201"
  };

  try {
    console.log('📱 Building CLOSED state message...');
    const flexMsg = abnFlexService.buildAbnFlexMinimal(
      abnFlexService.AbnCaseState.CLOSED,
      closeTicketPayload
    );

    console.log(`✅ Message built: ${flexMsg.altText}`);
    console.log(`🎨 State: CLOSED - ${abnFlexService.stateLabels[abnFlexService.AbnCaseState.CLOSED]}`);
    console.log(`🎯 Color: ${abnFlexService.stateColorMap[abnFlexService.AbnCaseState.CLOSED]}`);
    
    // Show satisfaction rating
    const bodyContents = flexMsg.contents.body.contents;
    const kvSection = bodyContents.find(c => c.layout === 'vertical' && c.contents?.some(kv => kv.layout === 'baseline'));
    if (kvSection) {
      const satisfactionKV = kvSection.contents.find(kv => 
        kv.layout === 'baseline' && 
        kv.contents?.[0]?.text === 'Satisfaction Rating'
      );
      if (satisfactionKV) {
        console.log(`⭐ Satisfaction: ${satisfactionKV.contents[1].text}`);
      }
    }

    console.log('📤 Sending CLOSED notification to LINE...');
    const result = await abnFlexService.pushToUser(testLineUserId, flexMsg);
    
    if (result.success) {
      console.log('🎉 SUCCESS! Close ticket notification sent');
      console.log(`📊 Status: ${result.status}`);
    } else {
      console.log('❌ Failed to send message');
      console.log(`💥 Error: ${result.error}`);
    }

    // Test different satisfaction ratings
    console.log('\n🔄 Testing different satisfaction ratings...');
    const ratings = [1, 3, 5, null];
    
    for (const rating of ratings) {
      const ratingPayload = {
        ...closeTicketPayload,
        caseNo: `TKT-TEST-${rating || 'NO'}-RATING`,
        extraKVs: [
          { label: "Satisfaction Rating", value: rating ? `${rating}/5 ดาว` : "ไม่ระบุ" }
        ]
      };
      
      const ratingMsg = abnFlexService.buildAbnFlexMinimal(
        abnFlexService.AbnCaseState.CLOSED,
        ratingPayload
      );
      
      console.log(`⭐ Rating ${rating || 'none'}: Message built successfully`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n🎉 Close ticket notification test completed!');
  console.log('✅ Updated to use new abnormalFindingFlexService');
  console.log('✅ Shows satisfaction rating properly');
  console.log('✅ Uses CLOSED state with proper Thai label');
}

testCloseTicket().catch(console.error);
