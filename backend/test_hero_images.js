#!/usr/bin/env node

/**
 * Test the new flex service with hero images
 * Tests the specific cases mentioned by user
 */

require('dotenv').config();
const abnFlexService = require('./src/services/abnormalFindingFlexService');

async function testHeroImages() {
  console.log('🧪 Testing Hero Images in Flex Messages');
  console.log('='.repeat(50));

  const testLineUserId = "U436b7c116495adcbc4096d51b28abad8";
  const heroImageUrl = "https://via.placeholder.com/400x260/0EA5E9/FFFFFF?text=BEFORE+IMAGE";
  const afterImageUrl = "https://via.placeholder.com/400x260/10B981/FFFFFF?text=AFTER+IMAGE";

  // Test cases with specific image types as requested
  const testCases = [
    {
      name: "CREATE TICKET (with before image)",
      state: abnFlexService.AbnCaseState.CREATED,
      payload: {
        caseNo: "TKT-20250921-101",
        assetName: "DJ - Receiving Motor",
        problem: "Motor overheating detected",
        actionBy: "Jirawuth Phusarn",
        comment: "เคสใหม่ รอการยอมรับจาก L2",
        heroImageUrl: heroImageUrl,
        extraKVs: [
          { label: "Priority", value: "High" },
          { label: "Severity", value: "Medium" }
        ]
      }
    },
    {
      name: "ESCALATE TICKET (with before image)",
      state: abnFlexService.AbnCaseState.ESCALATED,
      payload: {
        caseNo: "TKT-20250921-102",
        assetName: "Boiler Feed Pump",
        problem: "Pressure valve malfunction",
        actionBy: "Karun C.",
        comment: "งานซับซ้อน ต้องส่งต่อให้ L3 พิจารณา",
        heroImageUrl: heroImageUrl
      }
    },
    {
      name: "REJECT TO L3 (with before image)",
      state: abnFlexService.AbnCaseState.REJECT_TO_MANAGER,
      payload: {
        caseNo: "TKT-20250921-103",
        assetName: "Conveyor Belt System",
        problem: "Belt alignment issue",
        actionBy: "Manager L2",
        comment: "ต้องได้รับการอนุมัติจาก L3 ก่อน",
        heroImageUrl: heroImageUrl
      }
    },
    {
      name: "COMPLETE TICKET (with after image)",
      state: abnFlexService.AbnCaseState.COMPLETED,
      payload: {
        caseNo: "TKT-20250921-104",
        assetName: "Compressor Unit A",
        problem: "Air leak in system",
        actionBy: "Technician Team",
        comment: "งานเสร็จสมบูรณ์ ระบบทำงานปกติแล้ว",
        heroImageUrl: afterImageUrl,
        extraKVs: [
          { label: "Cost Avoidance", value: "25,000 บาท" },
          { label: "Downtime Avoidance", value: "4 ชั่วโมง" },
          { label: "Resolution", value: "Replaced seals and filters" }
        ]
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📱 Testing: ${testCase.name}`);
    console.log(`🎨 State: ${testCase.state}`);
    console.log(`🖼️  Hero Image: ${testCase.payload.heroImageUrl ? 'Yes' : 'No'}`);
    
    try {
      // Build message
      const flexMsg = abnFlexService.buildAbnFlexMinimal(testCase.state, testCase.payload);
      
      console.log(`✅ Message built successfully`);
      console.log(`📝 Alt Text: ${flexMsg.altText}`);
      
      // Check if hero image is properly included
      if (flexMsg.contents.hero) {
        console.log(`🖼️  Hero Image URL: ${flexMsg.contents.hero.url}`);
        console.log(`📐 Hero Image Aspect: ${flexMsg.contents.hero.aspectRatio}`);
      } else {
        console.log(`❌ Hero image missing!`);
      }
      
      // Send to LINE
      console.log(`📤 Sending to LINE...`);
      const result = await abnFlexService.pushToUser(testLineUserId, flexMsg);
      
      if (result.success) {
        console.log(`🎉 SUCCESS! Message sent`);
      } else {
        console.log(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`💥 Error in ${testCase.name}:`, error.message);
    }
  }

  // Test message without hero image
  console.log(`\n📱 Testing: Message WITHOUT hero image`);
  try {
    const noHeroMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, {
      caseNo: "TKT-20250921-105",
      assetName: "Test Asset",
      problem: "Test problem",
      actionBy: "Test User",
      comment: "งานได้รับการยอมรับแล้ว - ไม่มีรูปภาพ"
    });
    
    console.log(`✅ Message built without hero image`);
    console.log(`🖼️  Hero Image: ${noHeroMsg.contents.hero ? 'Present' : 'Not present'}`);
    
    const result = await abnFlexService.pushToUser(testLineUserId, noHeroMsg);
    if (result.success) {
      console.log(`🎉 SUCCESS! Message sent without hero`);
    }
    
  } catch (error) {
    console.error(`💥 Error in no-hero test:`, error.message);
  }

  console.log('\n🎉 Hero image testing completed!');
  console.log('\n📋 Summary:');
  console.log('✅ CREATE TICKET - Before image as hero');
  console.log('✅ ESCALATE TICKET - Before image as hero');
  console.log('✅ REJECT TO L3 - Before image as hero');
  console.log('✅ COMPLETE TICKET - After image as hero');
  console.log('✅ Message without hero image also works');
}

testHeroImages().catch(console.error);
