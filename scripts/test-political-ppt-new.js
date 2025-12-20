#!/usr/bin/env node

/**
 * Test script for Political PPT generation
 * Supports both static test data and real Tableau data fetching
 *
 * Usage:
 *   node test-political-ppt.js                    # Use static test data
 *   node test-political-ppt.js --real             # Fetch real data from Tableau
 *   node test-political-ppt.js --real --verbose   # Real data with verbose logging
 */

const fs = require("fs");
const path = require("path");
const pptConfigService = require("../src/services/ppt-config.service");
const pptBuilder = require("../src/utils/ppt-builder.util");
const tableauService = require("../src/services/tableau.service");
const dataTransformerService = require("../src/services/data-transformer.service");
const usecaseMapping = require("../src/config/usecase-mapping.json");
const { FORMAT_TYPES } = require("../src/utils/pptx-helpers.util");

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
        {
          field: "channel",
          value: "Channel Name",
          format: FORMAT_TYPES.STRING,
        },
        {
          field: "impressions",
          value: "Impressions",
          format: FORMAT_TYPES.STRING,
        },
        { field: "reach", value: "Reach", format: FORMAT_TYPES.STRING },
        { field: "frequency", value: "Frequency", format: FORMAT_TYPES.STRING },
      ],
      rows: [
        [
          { field: "channel", value: "CTV", format: FORMAT_TYPES.STRING },
          {
            field: "impressions",
            value: "4843174",
            format: FORMAT_TYPES.NUMBER,
          },
          { field: "reach", value: "367751", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "8.77", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "DISPLAY", format: FORMAT_TYPES.STRING },
          {
            field: "impressions",
            value: "3068102",
            format: FORMAT_TYPES.NUMBER,
          },
          { field: "reach", value: "289280", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "14.62", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "Video", format: FORMAT_TYPES.STRING },
          {
            field: "impressions",
            value: "325231",
            format: FORMAT_TYPES.NUMBER,
          },
          { field: "reach", value: "37792", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "8.60", format: FORMAT_TYPES.DECIMAL },
        ],
        [
          { field: "channel", value: "OTT", format: FORMAT_TYPES.STRING },
          {
            field: "impressions",
            value: "325215",
            format: FORMAT_TYPES.NUMBER,
          },
          { field: "reach", value: "15534", format: FORMAT_TYPES.NUMBER },
          { field: "frequency", value: "20.93", format: FORMAT_TYPES.DECIMAL },
        ],
      ],
    },
  };
}

/**
 * Fetch real data from Tableau for Political Snapshot use case
 */
async function fetchRealTableauData(useCase, filters = {}, verbose = false) {
  if (verbose) console.log("🔍 Fetching real data from Tableau...\n");

  // Get use case configuration
  const useCaseConfig = usecaseMapping[useCase];
  if (!useCaseConfig) {
    throw new Error(`Use case "${useCase}" not found in usecase-mapping.json`);
  }

  const { workbookName, siteName } = useCaseConfig;
  if (verbose) {
    console.log(`  - Use Case: ${useCase}`);
    console.log(`  - Workbook: ${workbookName}`);
    console.log(`  - Site: ${siteName}\n`);
  }

  // Build view configs for fetching
  if (verbose) console.log("📋 Building view configurations...");
  const viewConfigs = dataTransformerService.buildViewConfigsForFetching(
    useCase,
    filters
  );
  if (verbose)
    console.log(`  - View configs to fetch: ${viewConfigs.length}\n`);

  // Fetch data from Tableau
  if (verbose) console.log("⬇️  Fetching data from Tableau views...");
  const viewDataMap = await tableauService.fetchViewsDataInParallel(
    viewConfigs,
    workbookName,
    siteName,
    5 // concurrency
  );

  if (viewDataMap.size === 0) {
    throw new Error("No view data was successfully fetched from Tableau");
  }

  if (verbose) {
    console.log(`  - Successfully fetched ${viewDataMap.size} views\n`);
  }

  // Transform the data
  if (verbose) console.log("🔄 Transforming view data...");
  const transformedData = dataTransformerService.transformViewDataMap(
    useCase,
    viewDataMap
  );
  if (verbose) {
    console.log(
      `  - Transformed data keys: ${Object.keys(transformedData).join(", ")}\n`
    );
  }

  return transformedData;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    useReal: args.includes("--real"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
Political PPT Generation Test Script
=====================================

Usage:
  node test-political-ppt.js [options]

Options:
  --real        Fetch real data from Tableau (requires Tableau credentials)
  --verbose     Enable verbose logging
  -v            Alias for --verbose
  --help        Display this help message
  -h            Alias for --help

Examples:
  node test-political-ppt.js                  # Use static test data
  node test-political-ppt.js --real           # Use real Tableau data
  node test-political-ppt.js --real -v        # Real data with verbose output

`);
}

async function testPoliticalPpt() {
  const args = parseArgs();

  // Display help if requested
  if (args.help) {
    displayHelp();
    return;
  }

  const useCase = "POLITICAL_SNAPSHOT";
  const dataSource = args.useReal ? "Real Tableau Data" : "Static Test Data";

  console.log("========================================");
  console.log("Political PPT Generation Test");
  console.log("========================================");
  console.log(`📊 Data Source: ${dataSource}`);
  console.log(`🎯 Use Case: ${useCase}`);
  if (args.verbose) console.log(`📢 Verbose Mode: Enabled`);
  console.log("========================================\n");

  try {
    // Step 1: Get test data (static or real)
    console.log(
      `Step 1: ${args.useReal ? "Fetching" : "Loading"} test data...`
    );
    let viewData;

    if (args.useReal) {
      viewData = await fetchRealTableauData(useCase, {}, args.verbose);
      console.log("✓ Real data fetched from Tableau successfully\n");
    } else {
      viewData = getStaticTestData();
      console.log("✓ Static test data loaded successfully");
      if (args.verbose) {
        console.log(`  - Data keys: ${Object.keys(viewData).join(", ")}`);
      }
      console.log();
    }

    // Step 2: Generate PPT Config
    console.log("Step 2: Generating PPT config...");
    const requestData = {
      useCase,
      filters: {},
      viewData,
    };

    const pptConfig = await pptConfigService.getPptConfig(requestData);
    console.log("✓ PPT config generated successfully");
    console.log(`  - Title: ${pptConfig.TITLE}`);
    console.log(`  - Layout: ${pptConfig.LAYOUT}`);
    console.log(`  - Slides: ${pptConfig.SLIDES.length}`);

    if (args.verbose) {
      pptConfig.SLIDES.forEach((slide, idx) => {
        const elementTypes = Object.keys(slide)
          .filter((key) => Array.isArray(slide[key]) && slide[key].length > 0)
          .join(", ");
        console.log(
          `    Slide ${idx + 1}: ${elementTypes || "Background only"}`
        );
      });
    }
    console.log();

    // Step 3: Generate PPT File
    console.log("Step 3: Generating PPT file...");
    const pptBuffer = await pptBuilder.createSlidesAsBuffer(pptConfig);
    console.log("✓ PPT file generated successfully");
    console.log(`  - Size: ${(pptBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 4: Save PPT File
    console.log("Step 4: Saving PPT file...");
    const outputDir = __dirname;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const dataType = args.useReal ? "real" : "static";
    const fileName = `political-snapshot-${dataType}-${timestamp}.pptx`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, pptBuffer);
    console.log("✓ PPT file saved successfully");
    console.log(`  - File: ${fileName}`);
    console.log(`  - Path: ${filePath}\n`);

    console.log("========================================");
    console.log("✅ Test completed successfully!");
    console.log("========================================");

    return {
      success: true,
      filePath,
      fileName,
      fileSize: pptBuffer.length,
      dataSource: args.useReal ? "real" : "static",
    };
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ Test failed!");
    console.error("========================================");
    console.error(`Error: ${error.message}`);

    if (args.verbose && error.stack) {
      console.error("\n📋 Stack trace:");
      console.error(error.stack);
    }

    // Provide helpful hints based on error type
    if (
      error.message.includes("Tableau") ||
      error.message.includes("authentication")
    ) {
      console.error(
        "\n💡 Hint: Make sure Tableau credentials are properly configured in .env file"
      );
    } else if (error.message.includes("Use case")) {
      console.error(
        "\n💡 Hint: Check that the use case configuration exists in usecase-mapping.json"
      );
    } else if (error.message.includes("view data")) {
      console.error(
        "\n💡 Hint: Verify that the Tableau views exist and are accessible"
      );
    }

    console.error("========================================\n");
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testPoliticalPpt();
}

module.exports = testPoliticalPpt;
