#!/usr/bin/env node

/**
 * Test script for inspecting the Export PPT data flow (Steps A–E)
 *
 * Focuses on:
 *  - Building view configs for fetching (Step B)
 *  - Fetching Tableau data into a Map for all views (Step C)
 *  - Transforming the Map into PPT-ready data (Step E)
 *
 * This script DOES NOT:
 *  - Generate the PPT
 *  - Send any emails
 *
 * It is meant purely for debugging/understanding the data flow.
 */

require('dotenv').config();

const usecaseMapping = require('../src/config/usecase-mapping.json');
const dataTransformerService = require('../src/services/data-transformer.service');
const tableauService = require('../src/services/tableau.service');

async function testExportPptDataFlow() {
  console.log('========================================');
  console.log('Export PPT Data Flow Test (Steps A-E)');
  console.log('========================================\n');
  console.log('⚠️  This will make real Tableau API calls!');
  console.log('⚠️  Ensure Tableau credentials and filters are valid.\n');

  try {
    const useCase = process.env.TEST_USE_CASE || 'POLITICAL_SNAPSHOT';

    // You can override these via environment variables if needed
    const filters = {
      POLITICAL_ADVERTISER_NAME: 'Ohioans United for Education c.o Old Town Media <--> ldb6bq',
      CHANNEL: 'DISPLAY,CTV'
      // Add more filters here or via env vars if required:
      // ADVERTISER_ID_NAME, CAMPAIGN_ID_NAME, INSERTION_ORDER_ID, etc.
    };

    console.log('Job Context:');
    console.log(`  - Use Case: ${useCase}`);
    console.log(`  - Filters: ${JSON.stringify(filters, null, 2)}\n`);

    // Step A: Config Lookup (same as in ExportPptService)
    console.log('Step A: Looking up use case configuration...');
    const useCaseConfig = usecaseMapping[useCase];
    if (!useCaseConfig) {
      throw new Error(`Use case "${useCase}" not found in usecase-mapping.json`);
    }

    const { workbookName, siteName } = useCaseConfig;
    console.log('✓ Use case configuration retrieved:');
    console.log(`  - workbookName: ${workbookName}`);
    console.log(`  - siteName: ${siteName}\n`);

    // Step B: Build view configs for fetching
    console.log('Step B: Building view configs for fetching...');
    const viewConfigs = dataTransformerService.buildViewConfigsForFetching(
      useCase,
      filters
    );

    console.log('✓ View configs built');
    console.log(`  - Total view configs: ${viewConfigs.length}`);
    if (viewConfigs.length > 0) {
      console.log('  - Sample view configs (first 3):');
      viewConfigs.slice(0, 3).forEach((cfg, index) => {
        console.log(
          `    [${index}] viewKey=${cfg.viewKey}, viewName=${cfg.viewName}, filters=${JSON.stringify(
            cfg.filters
          )}`
        );
      });
    }
    console.log();

    // Step C: Fetch View Data (Parallel) - populates the Map<viewKey, rawData>
    console.log('Step C: Fetching view data in parallel (filling Map)...');
    const viewDataMap = await tableauService.fetchViewsDataInParallel(
      viewConfigs,
      workbookName,
      siteName,
      5 // concurrency limit
    );

    console.log('✓ View data fetched from Tableau');
    console.log(`  - Map size (number of successful views): ${viewDataMap.size}`);
    const mapKeys = Array.from(viewDataMap.keys());
    console.log(`  - Map keys (viewKeys): ${JSON.stringify(mapKeys)}\n`);

    // Inspect raw Tableau data shape for a few views
    console.log('Raw Tableau CSV data (first 3 views in Map):');
    mapKeys.slice(0, 3).forEach((key, idx) => {
      console.log(`  [${idx}] viewKey = ${key}`);
      const raw = viewDataMap.get(key) || '';
      if (typeof raw === 'string') {
        const lines = raw.split('\n').slice(0, 3);
        console.log(`    - Raw CSV first lines:`);
        lines.forEach((line) => console.log(`      ${line}`));
      } else {
        console.log('    - Unexpected non-string view data:', typeof raw);
      }
    });
    console.log();

    // Step D is just error handling in the service; here we continue even if some views are missing

    // Step E: Transform Tableau data to PPT format
    console.log('Step E: Transforming view data Map to PPT-ready format...');
    const transformedData = dataTransformerService.transformViewDataMap(
      useCase,
      viewDataMap
    );

    const transformedKeys = Object.keys(transformedData);
    console.log('✓ View data transformed');
    console.log(`  - Transformed view keys: ${JSON.stringify(transformedKeys)}\n`);

    // Inspect transformed data for a few views
    console.log('Transformed data samples (first 3 keys):');
    transformedKeys.slice(0, 3).forEach((key, idx) => {
      const value = transformedData[key];
      console.log(`  [${idx}] viewKey = ${key}`);

      if (value && value.headers && value.rows) {
        // TABLE type view
        console.log('    - Type: TABLE');
        console.log(`    - Headers count: ${value.headers.length}`);
        console.log(
          `    - Header fields: ${value.headers
            .map((h) => h.field)
            .slice(0, 10)
            .join(', ')}`
        );
        console.log(`    - Rows count: ${value.rows.length}`);
        if (value.rows[0]) {
          console.log(
            `    - First row sample: ${JSON.stringify(
              value.rows[0].slice(0, 10),
              null,
              2
            )}`
          );
        }
      } else if (value && value.field !== undefined) {
        // FLAG_CARD type view
        console.log('    - Type: FLAG_CARD');
        console.log(`    - field: ${value.field}`);
        console.log(`    - value: ${value.value}`);
        console.log(`    - format: ${value.format}`);
      } else {
        console.log('    - Unknown/empty transformed value:', value);
      }
    });
    console.log();

    console.log('========================================');
    console.log('✓ Export PPT data flow inspection completed!');
    console.log('========================================');

    return {
      success: true,
      useCase,
      viewConfigCount: viewConfigs.length,
      mapSize: viewDataMap.size,
      transformedViewCount: transformedKeys.length,
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Export PPT data flow test failed!');
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
  testExportPptDataFlow();
}

module.exports = testExportPptDataFlow;


