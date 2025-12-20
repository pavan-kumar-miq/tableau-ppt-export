#!/usr/bin/env node

/**
 * Test script for Political PPT generation
 * Tests PPT config generation and file export (using static data)
 * This is a quick test that doesn't require Tableau API access
 */

const fs = require('fs');
const path = require('path');
const pptConfigService = require('../src/services/ppt-config.service');
const pptBuilder = require('../src/utils/ppt-builder.util');
const { FORMAT_TYPES } = require('../src/utils/pptx-helpers.util');

/**
 * Static test data for Political Snapshot
 * This mimics the data structure returned by DataTransformerService
 */
function getStaticTestData() {
  return {
    TRACKABLE_IMPRESSIONS: {
      field: "impressions",
      value: "587249",
      format: FORMAT_TYPES.NUMBER,
    },
    REACH: {
      field: "reach",
      value: "576721",
      format: FORMAT_TYPES.NUMBER,
    },
    AVG_FREQUENCY: {
      field: "frequency",
      value: "13.7",
      format: FORMAT_TYPES.DECIMAL,
    },
    VIDEO_PERFORMANCE: {
      field: "vcr",
      value: "59.49",
      format: FORMAT_TYPES.PERCENTAGE,
    },
    CLICK_PERFORMANCE: {
      field: "ctr",
      value: "57.03",
      format: FORMAT_TYPES.PERCENTAGE,
    },
    TOP_CHANNEL: {
      field: "channel",
      value: "OTT & OLV",
      format: FORMAT_TYPES.STRING,
    },
    TOP_DEVICE: {
      field: "device",
      value: "Roku",
      format: FORMAT_TYPES.STRING,
    },
    TOP_APP: {
      field: "app",
      value: "Tubi - Free Movies",
      format: FORMAT_TYPES.STRING,
    },
    CHANNEL_DATA: {
      headers: [
        { field: "channel", value: "Channel Name", format: FORMAT_TYPES.STRING },
        { field: "impressions", value: "Impressions", format: FORMAT_TYPES.STRING },
        { field: "reach", value: "Reach", format: FORMAT_TYPES.STRING },
        { field: "frequency", value: "Frequency", format: FORMAT_TYPES.STRING },
      ],
      rows: [
        [
          { field: "channel", value: "CTV", format: FORMAT_TYPES.STRING },
          { field: "impressions", value: "4843174", format: FORMAT_TYPES.NUMBER },
          { field: "reach", value: "367751", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "8.77", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "DISPLAY", format: FORMAT_TYPES.STRING },
          { field: "impressions", value: "3068102", format: FORMAT_TYPES.NUMBER },
          { field: "reach", value: "289280", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "14.62", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "Video", format: FORMAT_TYPES.STRING },
          { field: "impressions", value: "325231", format: FORMAT_TYPES.NUMBER },
          { field: "reach", value: "37792", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "8.60", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "OTT", format: FORMAT_TYPES.STRING },
          { field: "impressions", value: "325215", format: FORMAT_TYPES.NUMBER },
          { field: "reach", value: "15534", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "20.93", format: FORMAT_TYPES.DECIMAL },
        ],
      ],
    },
  };
}

async function testPoliticalPpt() {
  console.log('========================================');
  console.log('Political PPT Generation Test');
  console.log('========================================\n');
  console.log('ℹ️  This test uses static data (no Tableau API calls)\n');

  try {
    // Step 1: Generate PPT Config with static test data
    console.log('Step 1: Generating PPT config...');
    const staticTestData = getStaticTestData();
    const requestData = {
      useCase: 'POLITICAL_SNAPSHOT',
      filters: {},
      viewData: staticTestData
    };

    const pptConfig = await pptConfigService.getPptConfig(requestData);
    console.log('✓ PPT config generated successfully');
    console.log(`  - Title: ${pptConfig.TITLE}`);
    console.log(`  - Layout: ${pptConfig.LAYOUT}`);
    console.log(`  - Slides: ${pptConfig.SLIDES.length}\n`);

    // Step 2: Generate PPT File
    console.log('Step 2: Generating PPT file...');
    const pptBuffer = await pptBuilder.createSlidesAsBuffer(pptConfig);
    console.log('✓ PPT file generated successfully');
    console.log(`  - Size: ${(pptBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 3: Save PPT File
    console.log('Step 3: Saving PPT file...');
    const outputDir = __dirname;
    const fileName = `political-snapshot-test-${Date.now()}.pptx`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, pptBuffer);
    console.log('✓ PPT file saved successfully');
    console.log(`  - File: ${fileName}`);
    console.log(`  - Path: ${filePath}\n`);

    console.log('========================================');
    console.log('✓ Test completed successfully!');
    console.log('========================================');

    return {
      success: true,
      filePath,
      fileName,
      fileSize: pptBuffer.length
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Test failed!');
    console.error('========================================');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testPoliticalPpt();
}

module.exports = testPoliticalPpt;

