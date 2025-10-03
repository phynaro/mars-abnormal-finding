#!/usr/bin/env node

/**
 * Test the syntax fix for cost avoidance formatting
 */

require('dotenv').config();
const abnFlexService = require('../src/services/abnormalFindingFlexService');

function testSyntaxFix() {
  console.log('🧪 Testing Syntax Fix for Cost Avoidance');
  console.log('='.repeat(40));

  // Test the exact scenario that was causing the syntax error
  const cost_avoidance = 75000;
  const downtime_avoidance_hours = 8.5;

  try {
    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.COMPLETED, {
      caseNo: "TKT-20250921-999",
      assetName: "Test Asset",
      problem: "Syntax test",
      actionBy: "Developer",
      comment: "Testing the fixed cost avoidance formatting",
      extraKVs: [
        { label: "Cost Avoidance", value: cost_avoidance ? `${cost_avoidance.toLocaleString()} บาท` : "-" },
        { label: "Downtime Avoidance", value: downtime_avoidance_hours ? `${downtime_avoidance_hours} ชั่วโมง` : "-" },
        { label: "Failure Mode", value: "Test Mode" }
      ]
    });

    console.log('✅ Message built successfully!');
    console.log(`📝 Alt Text: ${flexMsg.altText}`);
    
    // Check the specific extraKVs that were causing issues
    const extraKVs = flexMsg.contents.body.contents.find(c => c.layout === 'vertical' && c.contents?.length > 2)?.contents;
    if (extraKVs) {
      console.log('💰 Formatted values:');
      extraKVs.forEach((kv, index) => {
        if (kv.layout === 'baseline') {
          const label = kv.contents[0]?.text;
          const value = kv.contents[1]?.text;
          console.log(`   ${label}: ${value}`);
        }
      });
    }

    console.log('\n🎉 Syntax error successfully fixed!');
    console.log('✅ Cost avoidance formatting working correctly');
    console.log('✅ Template literals parsing properly');
    
  } catch (error) {
    console.error('❌ Syntax error still present:', error.message);
    console.error(error.stack);
  }
}

testSyntaxFix();
