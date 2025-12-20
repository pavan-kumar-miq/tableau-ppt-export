#!/usr/bin/env node

/**
 * Test script for DataTransformerService
 * Tests view config building and data transformation
 */

require('dotenv').config();
const dataTransformerService = require('../src/services/data-transformer.service');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testDataTransformerService() {
  console.log('========================================');
  console.log('Data Transformer Service Test');
  console.log('========================================\n');

  try {
    const useCase = 'POLITICAL_SNAPSHOT';
    const filters = {
      POLITICAL_ADVERTISER_NAME: 'Test Advertiser',
      CHANNEL: 'CTV'
    };

    // Step 1: Test View Config Building
    console.log('Step 1: Testing View Config Building...');
    const viewConfigs = dataTransformerService.buildViewConfigsForFetching(useCase, filters);
    assert(Array.isArray(viewConfigs) && viewConfigs.length > 0, 'Expected at least one view config');
    console.log('✓ View configs built');
    console.log(`  - Total Views: ${viewConfigs.length}`);
    console.log(`  - Sample View: ${viewConfigs[0]?.viewName} (${viewConfigs[0]?.viewKey})`);
    console.log(`  - Sample Filters: ${JSON.stringify(viewConfigs[0]?.filters)}\n`);

    // Step 2: Test Flag Card Data Transformation
    console.log('Step 2: Testing Flag Card Data Transformation (CSV path)...');
    // CSV for TRACKABLE_IMPRESSIONS view:
    // Header matches tableau-views.json columnName, data row is the value.
    const mockFlagCardCsv = 'Trackable Impressions\n587249\n';
    const transformedFlagCard = dataTransformerService.transformTableauData(
      useCase,
      'TRACKABLE_IMPRESSIONS',
      mockFlagCardCsv
    );
    assert(
      transformedFlagCard && transformedFlagCard.value === '587249',
      'Flag card should contain the expected impressions value'
    );
    console.log('✓ Flag card data transformed');
    console.log(`  - Field: ${transformedFlagCard?.field}`);
    console.log(`  - Value: ${transformedFlagCard?.value}`);
    console.log(`  - Format: ${transformedFlagCard?.format}\n`);

    // Step 3: Test Table Data Transformation
    console.log('Step 3: Testing Table Data Transformation (CSV path)...');
    // CSV for CHANNEL_DATA view:
    // Headers must match tableau-views.json columnName values.
    const mockTableCsv =
      'Channel,Avg Frequency,Reach,Trackable Impressions,Trackable Impressions\n' +
      'CTV,9.24,2271160,21,21\n' +
      'DISPLAY,13.5,367751,10,10\n';
    const transformedTable = dataTransformerService.transformTableauData(
      useCase,
      'CHANNEL_DATA',
      mockTableCsv
    );
    assert(
      transformedTable && Array.isArray(transformedTable.rows),
      'Table transformation should return rows'
    );
    assert(
      transformedTable.rows.length === 2,
      `Expected 2 table rows, got ${transformedTable.rows.length}`
    );
    console.log('✓ Table data transformed');
    console.log(`  - Headers: ${transformedTable?.headers?.length || 0}`);
    console.log(`  - Rows: ${transformedTable?.rows?.length || 0}`);
    if (transformedTable?.headers) {
      console.log(`  - Header Fields: ${transformedTable.headers.map((h) => h.field).join(', ')}`);
    }
    if (transformedTable?.rows?.[0]) {
      console.log(`  - Sample Row: ${JSON.stringify(transformedTable.rows[0])}\n`);
    }

    // Step 4: Test View Data Map Transformation
    console.log('Step 4: Testing View Data Map Transformation...');
    const viewDataMap = new Map();
    viewDataMap.set('TRACKABLE_IMPRESSIONS', mockFlagCardCsv);
    viewDataMap.set('CHANNEL_DATA', mockTableCsv);

    const transformedMap = dataTransformerService.transformViewDataMap(useCase, viewDataMap);
    const transformedKeys = Object.keys(transformedMap);
    assert(
      transformedKeys.length === 2,
      `Expected 2 transformed views, got ${transformedKeys.length}`
    );
    console.log('✓ View data map transformed');
    console.log(`  - Transformed Views: ${transformedKeys.length}`);
    console.log(`  - View Keys: ${transformedKeys.join(', ')}\n`);

    console.log('========================================');
    console.log('✓ All Data Transformer Service tests passed!');
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
  testDataTransformerService();
}

module.exports = testDataTransformerService;

