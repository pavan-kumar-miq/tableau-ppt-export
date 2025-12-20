# Political PPT Test Script Documentation

## Overview

The `test-political-ppt.js` script is a comprehensive testing tool for generating Political Snapshot PowerPoint presentations. It supports both static test data (for quick testing without API dependencies) and live Tableau data fetching (for end-to-end testing).

## Location

```
scripts/test-political-ppt.js
```

## Features

### 🎯 Dual Data Source Support

1. **Static Test Data Mode** (Default)

   - Uses pre-defined mock data
   - No Tableau API calls required
   - Fast execution (~2-3 seconds)
   - Perfect for development and quick validation

2. **Real Tableau Data Mode**
   - Fetches live data from Tableau Server
   - Requires valid Tableau credentials
   - Full end-to-end testing
   - Validates the complete data pipeline

### 🛠️ Command Line Options

| Option      | Alias | Description                                               |
| ----------- | ----- | --------------------------------------------------------- |
| `--real`    | -     | Fetch real data from Tableau instead of using static data |
| `--verbose` | `-v`  | Enable detailed logging for debugging                     |
| `--help`    | `-h`  | Display usage information and examples                    |

### 📊 What It Tests

The script validates the complete PPT generation pipeline:

1. **Data Fetching** (real mode only)

   - Tableau view configuration lookup
   - Parallel data fetching from multiple views
   - Error handling for API failures

2. **Data Transformation**

   - View data mapping to PPT data keys
   - Format type conversion (NUMBER, DECIMAL, PERCENTAGE, STRING)
   - Table and chart data structuring

3. **PPT Configuration**

   - Generic config-driven slide generation
   - JSON mapping interpretation
   - Dynamic content binding

4. **PPT Generation**
   - Slide creation with backgrounds, images, shapes
   - Text rendering with multi-part content
   - Table rendering with custom styling
   - Chart rendering (BAR_LINE combo charts)
   - File output and validation

## Usage

### Basic Usage (Static Data)

```bash
node scripts/test-political-ppt.js
```

**Output:**

- Generates: `political-snapshot-static-<timestamp>.pptx`
- Location: `scripts/` directory
- Duration: ~2-3 seconds

### Real Tableau Data

```bash
node scripts/test-political-ppt.js --real
```

**Requirements:**

- Tableau credentials configured in `.env`
- Access to the configured workbook and views
- Network connectivity to Tableau Server

**Output:**

- Generates: `political-snapshot-real-<timestamp>.pptx`
- Location: `scripts/` directory
- Duration: ~10-30 seconds (depending on data volume)

### Verbose Mode

```bash
node scripts/test-political-ppt.js --real --verbose
```

**Additional Output:**

- View configuration details
- Data fetching progress
- Transformation step details
- Slide element breakdown
- Detailed error stack traces

### Display Help

```bash
node scripts/test-political-ppt.js --help
```

## Static Test Data

The script includes comprehensive mock data that covers all Political Snapshot data requirements:

### Metric Data Points

- `TRACKABLE_IMPRESSIONS`: 587,249
- `REACH`: 576,721
- `AVG_FREQUENCY`: 13.7
- `VIDEO_PERFORMANCE`: 59.49%
- `CLICK_PERFORMANCE`: 57.03%
- `TOP_CHANNEL`: "OTT & OLV"
- `TOP_DEVICE`: "Roku"
- `TOP_APP`: "Tubi - Free Movies"

### Table/Chart Data

- `CHANNEL_DATA`: 4 rows × 4 columns
  - Channels: CTV, DISPLAY, Video, OTT
  - Metrics: Impressions, Reach, Frequency

## Output Details

### Generated Presentation Structure

The script generates a 5-slide Political Snapshot presentation:

1. **Slide 1: Cover Slide**

   - MiQ Logo
   - Client logo placeholder
   - Advertiser name
   - Campaign label

2. **Slide 2: Section Divider**

   - "Performance Display" title

3. **Slide 3: Campaign Performance Overview**

   - Spend, Impressions, Inventory metrics
   - Reach and Frequency
   - Video and Click performance
   - Top channel, device, app

4. **Slide 4: Channel Data Table**

   - "Reach & Frequency by Channel"
   - Formatted data table with custom styling

5. **Slide 5: Channel Data Chart**
   - "Reach & Frequency by Channel"
   - Combo bar/line chart
   - Dual Y-axes for Impressions and Reach

### File Naming Convention

```
political-snapshot-{data-source}-{timestamp}.pptx
```

**Examples:**

- `political-snapshot-static-2025-12-18T15-34-16.pptx`
- `political-snapshot-real-2025-12-18T16-22-45.pptx`

**Components:**

- `data-source`: `static` or `real`
- `timestamp`: ISO format (YYYY-MM-DDTHH-mm-ss)

## Expected Output

### Successful Execution

```
========================================
Political PPT Generation Test
========================================
📊 Data Source: Static Test Data
🎯 Use Case: POLITICAL_SNAPSHOT
========================================

Step 1: Loading test data...
✓ Static test data loaded successfully

Step 2: Generating PPT config...
✓ PPT config generated successfully
  - Title: Political Snapshot Report
  - Layout: LAYOUT_WIDE
  - Slides: 5

Step 3: Generating PPT file...
✓ PPT file generated successfully
  - Size: 1454.47 KB

Step 4: Saving PPT file...
✓ PPT file saved successfully
  - File: political-snapshot-static-2025-12-18T15-34-16.pptx
  - Path: /path/to/scripts/political-snapshot-static-2025-12-18T15-34-16.pptx

========================================
✅ Test completed successfully!
========================================
```

### Error Scenarios

#### Tableau Connection Error

```
❌ Test failed!
Error: Failed to authenticate with Tableau Server

💡 Hint: Make sure Tableau credentials are properly configured in .env file
```

#### Use Case Configuration Error

```
❌ Test failed!
Error: Use case "POLITICAL_SNAPSHOT" not found in usecase-mapping.json

💡 Hint: Check that the use case configuration exists in usecase-mapping.json
```

#### Missing View Data Error

```
❌ Test failed!
Error: No view data was successfully fetched from Tableau

💡 Hint: Verify that the Tableau views exist and are accessible
```

## Troubleshooting

### Issue: Colors appear black in PPT

**Symptom:**

```
"primaryPink" is not a valid scheme color or hex RGB! "000000" used instead.
"primaryGold" is not a valid scheme color or hex RGB! "000000" used instead.
```

**Cause:** The chart builder may not be resolving color names in the chartColors array.

**Impact:** Minor - colors may default to black in some chart elements, but PPT still generates successfully.

**Solution:** Verify color definitions in `src/utils/pptx-helpers.util.js`

### Issue: File not found errors

**Symptom:** Cannot find image files (MiQ_Logo.png, background images)

**Cause:** Missing image assets

**Solution:** Ensure all required images exist in `assets/images/` directory

### Issue: Tableau authentication fails

**Symptom:** 401 Unauthorized or connection errors

**Solution:**

1. Check `.env` file has correct credentials:
   ```
   TABLEAU_SERVER=your-tableau-server.com
   TABLEAU_USERNAME=your-username
   TABLEAU_PASSWORD=your-password
   ```
2. Verify network access to Tableau Server
3. Confirm user permissions for the workbook

## Integration with CI/CD

### Quick Validation Test

Add to your CI pipeline for fast validation:

```bash
# In your CI configuration
npm test:political-ppt
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:political-ppt": "node scripts/test-political-ppt.js"
  }
}
```

### End-to-End Test

For staging/production validation:

```bash
# Full test with real data
node scripts/test-political-ppt.js --real --verbose
```

## Dependencies

### Direct Dependencies

- `pptConfigService` - Generic config-driven PPT generation
- `pptBuilder` - PowerPoint file creation utilities
- `tableauService` - Tableau API integration
- `dataTransformerService` - Data transformation logic
- `pptx-helpers` - PPT styling and formatting utilities

### Required Configuration Files

- `src/config/usecase-mapping.json` - Use case to Tableau mapping
- `src/config/slide-view-mapping.json` - Slide layout and element definitions
- `src/config/tableau-views.json` - View-specific configurations

### Environment Variables (for `--real` mode)

- `TABLEAU_SERVER` - Tableau Server URL
- `TABLEAU_USERNAME` - Tableau username
- `TABLEAU_PASSWORD` - Tableau password
- `TABLEAU_SITE` - Tableau site name (optional)

## Development

### Adding New Test Data

Edit the `getStaticTestData()` function:

```javascript
function getStaticTestData() {
  return {
    TRACKABLE_IMPRESSIONS: {
      field: "impressions",
      value: "587249",
      format: FORMAT_TYPES.NUMBER,
    },
    // Add new data keys here
    YOUR_NEW_METRIC: {
      field: "metric_name",
      value: "123456",
      format: FORMAT_TYPES.NUMBER,
    },
  };
}
```

### Testing New Slides

1. Update `slide-view-mapping.json` with new slide configuration
2. Run the test script to validate changes:
   ```bash
   node scripts/test-political-ppt.js
   ```
3. Check generated PPT for correctness

### Debugging Tips

1. **Use verbose mode** for detailed logs:

   ```bash
   node scripts/test-political-ppt.js --verbose
   ```

2. **Check individual slides** by examining the PPT config output

3. **Validate data structure** matches expected format:

   - Metric data: `{field, value, format}`
   - Table/Chart data: `{headers, rows}`

4. **Test incrementally**:
   - Start with static data
   - Validate PPT structure
   - Then test with real data

## Related Documentation

- [API Examples](API_EXAMPLES.md) - Request/response examples
- [End-to-End Flow](END_TO_END_FLOW.md) - Complete workflow documentation
- [Generic PPT Config](../src/services/ppt-config.service.js) - Config service implementation
- [Slide Mapping Schema](../src/config/slide-view-mapping.json) - JSON configuration format

## Version History

### v2.0.0 (Current)

- ✨ Added `--real` flag for Tableau data fetching
- ✨ Added `--verbose` flag for detailed logging
- ✨ Enhanced error messages with contextual hints
- ✨ Improved file naming with timestamp and data source
- 🔧 Refactored to use generic config service
- 📝 Added comprehensive help documentation

### v1.0.0 (Legacy)

- ⚠️ Used dedicated `political-snapshot.service.js` (now deprecated)
- Basic static data testing only
- Simple timestamp-based file naming

## Support

For issues or questions:

1. Check this documentation
2. Review error messages and hints
3. Enable `--verbose` mode for detailed logs
4. Verify configuration files are correct
5. Test with static data first before using `--real` mode
