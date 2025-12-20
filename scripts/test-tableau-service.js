#!/usr/bin/env node

/**
 * Test script for TableauService
 * Tests Tableau API authentication and data fetching
 */

require('dotenv').config();
const tableauService = require('../src/services/tableau.service');
const usecaseMapping = require('../src/config/usecase-mapping.json');

async function testTableauService() {
  console.log('========================================');
  console.log('Tableau Service Test');
  console.log('========================================\n');

  try {
    const useCase = 'POLITICAL_SNAPSHOT';
    const { workbookName, siteName } = usecaseMapping[useCase];

    // Step 1: Test Authentication
    console.log('Step 1: Testing Tableau Authentication...');
    const { token, siteId } = await tableauService.getValidToken(siteName);
    console.log('✓ Authentication successful');
    console.log(`  - Site: ${siteName}`);
    console.log(`  - Site ID: ${siteId}`);
    console.log(`  - Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Test Workbook Fetching
    console.log('Step 2: Testing Workbook Fetching...');
    const workbook = await tableauService.getWorkbookByName(workbookName, siteName);
    console.log('✓ Workbook found');
    console.log(`  - Workbook ID: ${workbook.id}`);
    console.log(`  - Workbook Name: ${workbook.name}`);
    console.log(`  - Content URL: ${workbook.contentUrl}\n`);

    // Step 3: Test Views Fetching
    console.log('Step 3: Testing Views Fetching...');
    const views = await tableauService.getWorkbookViews(workbook.id, siteName);
    console.log('✓ Views fetched');
    console.log(`  - Total Views: ${views.length}`);
    console.log(`  - View Names: ${views.slice(0, 5).map(v => v.name).join(', ')}${views.length > 5 ? '...' : ''}\n`);

    // Step 4: Test Single View Data Export
    if (views.length > 0) {
    console.log('Step 4: Testing Single View Data Export...');
      const testView = views[0];
      const filters = {};

      const viewData = await tableauService.exportData(testView.id, filters, siteName);
      console.log('✓ View data exported');
      console.log(`  - View: ${testView.name}`);
      console.log(`  - Type: ${typeof viewData}`);
      if (typeof viewData === 'string') {
        const lines = viewData.split('\n');
        console.log(`  - CSV line count: ${lines.length}`);
        console.log('  - Sample (first 3 lines):');
        lines.slice(0, 3).forEach((line) => console.log(`    ${line}`));
      } else {
        console.log('  - Unexpected non-string view data:', viewData);
      }
    }

    console.log('========================================');
    console.log('✓ All Tableau Service tests passed!');
    console.log('========================================');

    return { success: true };
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
  testTableauService();
}

module.exports = testTableauService;

