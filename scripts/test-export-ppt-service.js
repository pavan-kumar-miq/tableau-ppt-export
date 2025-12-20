#!/usr/bin/env node

/**
 * Test script for ExportPptService
 * Tests the full end-to-end export flow (without actually sending email)
 */

require('dotenv').config();
const exportPptService = require('../src/services/export-ppt.service');
const fs = require('fs');
const path = require('path');

async function testExportPptService() {
  console.log('========================================');
  console.log('Export PPT Service Test (Full Flow)');
  console.log('========================================\n');
  console.log('⚠️  This will make real Tableau API calls!');
  console.log('⚠️  Ensure Tableau credentials are configured.\n');

  try {
    const jobData = {
      useCase: 'POLITICAL_SNAPSHOT',
      email: 'pavan.kumar@miqdigital.com',
      filters: {
        POLITICAL_ADVERTISER_NAME: 'Ohioans United for Education c.o Old Town Media <--> ldb6bq',
        CHANNEL: 'DISPLAY,CTV'
      }
    };

    console.log('Job Data:');
    console.log(`  - Use Case: ${jobData.useCase}`);
    console.log(`  - Email: ${jobData.email}`);
    console.log(`  - Filters: ${JSON.stringify(jobData.filters)}\n`);

    console.log('Starting export job...\n');

    // This will:
    // 1. Look up use case config
    // 2. Authenticate with Tableau
    // 3. Fetch view data in parallel
    // 4. Transform data
    // 5. Generate PPT
    // 6. Send email (if notification service is configured)
    const result = await exportPptService.processExport(jobData);

    console.log('========================================');
    console.log('✓ Export job completed successfully!');
    console.log('========================================');
    console.log('Result:');
    console.log(`  - Success: ${result.success}`);
    console.log(`  - File Name: ${result.fileName}`);
    console.log(`  - Email: ${result.email}`);
    console.log(`  - Views Processed: ${result.viewsProcessed || 'N/A'}\n`);

    return result;
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Export job failed!');
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
  testExportPptService();
}

module.exports = testExportPptService;

