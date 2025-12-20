#!/usr/bin/env node

/**
 * Test script for inspecting the CHANNEL_DATA flow (Tableau → Transformations)
 *
 * Focuses on a single TABLE view:
 *  - Builds only the CHANNEL_DATA view config
 *  - Fetches Tableau data for that view
 *  - Runs it through DataTransformerService
 *  - Logs raw CSV shape and transformed table shape
 *
 * This script DOES NOT:
 *  - Generate the PPT
 *  - Send any emails
 */

require('dotenv').config();

const usecaseMapping = require('../src/config/usecase-mapping.json');
const dataTransformerService = require('../src/services/data-transformer.service');
const tableauService = require('../src/services/tableau.service');

const TARGET_VIEW_KEY = 'CHANNEL_DATA';

async function testChannelDataFlow() {
  console.log('========================================');
  console.log('CHANNEL_DATA Flow Test (Tableau → Transformations)');
  console.log('========================================\n');
  console.log('⚠️  This will make real Tableau API calls!');
  console.log('⚠️  Ensure Tableau credentials and filters are valid.\n');

  try {
    const useCase = process.env.TEST_USE_CASE || 'POLITICAL_SNAPSHOT';

    // You can override these via environment variables if needed
    const filters = {
      POLITICAL_ADVERTISER_NAME:
        'Ohioans United for Education c.o Old Town Media <--> ldb6bq',
      CHANNEL: 'DISPLAY,CTV',
    };

    console.log('Job Context:');
    console.log(`  - Use Case: ${useCase}`);
    console.log(`  - Target View Key: ${TARGET_VIEW_KEY}`);
    console.log(`  - Filters: ${JSON.stringify(filters, null, 2)}\n`);

    // Step A: Config Lookup
    console.log('Step A: Looking up use case configuration...');
    const useCaseConfig = usecaseMapping[useCase];
    if (!useCaseConfig) {
      throw new Error(`Use case "${useCase}" not found in usecase-mapping.json`);
    }

    const { workbookName, siteName } = useCaseConfig;
    console.log('✓ Use case configuration retrieved:');
    console.log(`  - workbookName: ${workbookName}`);
    console.log(`  - siteName: ${siteName}\n`);

    // Step B: Build view configs, then filter to CHANNEL_DATA
    console.log('Step B: Building view configs for fetching...');
    const allViewConfigs = dataTransformerService.buildViewConfigsForFetching(
      useCase,
      filters
    );

    console.log(
      `  - Total view configs for use case: ${allViewConfigs.length}`
    );

    const viewConfigs = allViewConfigs.filter(
      (cfg) => cfg.viewKey.toUpperCase() === TARGET_VIEW_KEY
    );

    console.log(
      `  - View configs matching "${TARGET_VIEW_KEY}": ${viewConfigs.length}`
    );

    if (viewConfigs.length === 0) {
      console.error(
        `✗ No view configs found for viewKey "${TARGET_VIEW_KEY}". Available viewKeys: ${allViewConfigs
          .map((c) => c.viewKey)
          .join(', ')}`
      );
      process.exit(1);
    }

    const cfg = viewConfigs[0];
    console.log('✓ Using CHANNEL_DATA view config:');
    console.log(
      `  - viewKey=${cfg.viewKey}, viewName=${cfg.viewName}, filters=${JSON.stringify(
        cfg.filters
      )}\n`
    );

    // Step C: Fetch View Data for CHANNEL_DATA only
    console.log(
      'Step C: Fetching Tableau data for CHANNEL_DATA (single view)...'
    );
    const viewDataMap = await tableauService.fetchViewsDataInParallel(
      [cfg],
      workbookName,
      siteName,
      1 // concurrency limit (only one view anyway)
    );

    console.log('✓ View data fetched from Tableau');
    console.log(
      `  - Map size (number of successful views): ${viewDataMap.size}\n`
    );

    if (!viewDataMap.has(TARGET_VIEW_KEY)) {
      console.error(
        `✗ View data Map does not contain key "${TARGET_VIEW_KEY}". Keys present: ${JSON.stringify(
          Array.from(viewDataMap.keys())
        )}`
      );
      process.exit(1);
    }

    const rawData = viewDataMap.get(TARGET_VIEW_KEY) || '';
    console.log('Raw Tableau data for CHANNEL_DATA:');
    if (typeof rawData === 'string') {
      const lines = rawData.split('\n').slice(0, 10);
      console.log('  - First few CSV lines:');
      lines.forEach((line, idx) => console.log(`    [${idx}] ${line}`));
    } else {
      console.log('  - Unexpected non-string view data type:', typeof rawData);
    }
    console.log();

    // Step D/E: Transform Tableau data to PPT-friendly TABLE structure
    console.log(
      'Step D/E: Transforming CHANNEL_DATA view data to PPT-ready TABLE format...'
    );
    const transformed = dataTransformerService.transformTableauData(
      useCase,
      TARGET_VIEW_KEY,
      rawData
    );

    if (!transformed) {
      console.error('✗ Transformation returned null/undefined for CHANNEL_DATA');
      process.exit(1);
    }

    if (transformed.headers && transformed.rows) {
      console.log('✓ CHANNEL_DATA transformed as TABLE');
      console.log(`  - Headers count: ${transformed.headers.length}`);
      console.log(
        `  - Header fields: ${transformed.headers
          .map((h) => h.field)
          .join(', ')}`
      );
      console.log(`  - Rows count: ${transformed.rows.length}`);
      if (transformed.rows[0]) {
        console.log(
          `  - First row sample: ${JSON.stringify(
            transformed.rows[0],
            null,
            2
          )}`
        );
      }
    } else {
      console.log(
        '  - Unexpected transformed structure for CHANNEL_DATA:',
        transformed
      );
    }
    console.log();

    console.log('========================================');
    console.log('✓ CHANNEL_DATA flow inspection completed!');
    console.log('========================================');

    return {
      success: true,
      useCase,
      viewKey: TARGET_VIEW_KEY,
      hasRawData: !!rawData,
      rowCount: transformed.rows ? transformed.rows.length : 0,
      headerCount: transformed.headers ? transformed.headers.length : 0,
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ CHANNEL_DATA flow test failed!');
    console.error('========================================');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test when executed directly
if (require.main === module) {
  testChannelDataFlow();
}

module.exports = testChannelDataFlow;


