# End-to-End Flow Verification

## Architecture Overview

```
POST /api/v1/jobs
  ↓
Job Controller (validates & queues to BullMQ)
  ↓
BullMQ Queue (Redis-backed)
  ↓
BullMQ Worker (integrated in server process) picks up job
  ↓
ExportPptService.processExport()
  ├─→ Step A: Config Lookup (usecase-mapping.json)
  ├─→ Step B: Build View Configs (DataTransformerService)
  ├─→ Step C: Fetch View Data (TableauService - Parallel)
  ├─→ Step D: Error Handling
  ├─→ Step E: Transform Data (DataTransformerService)
  ├─→ Step F: Generate PPT (PptConfigService → PoliticalSnapshotService)
  └─→ Step G: Email Delivery (NotificationService)
```

## Detailed Flow

### Step A: Config Lookup
- **Service**: `ExportPptService`
- **Action**: Reads `usecase-mapping.json`
- **Output**: `{ workbookName, siteName }`
- **Example**:
  ```json
  {
    "workbookName": "PoliticalSnapshotDashboardEditablPPTNewTest",
    "siteName": "miqdigital-us"
  }
  ```

### Step B: Build View Configs
- **Service**: `DataTransformerService.buildViewConfigsForFetching()`
- **Action**: Reads `tableau-views.json`, builds filter params using `view-config.util`
- **Output**: Array of `{ viewName, viewKey, filters }`
- **Example**:
  ```javascript
  [
    {
      viewName: "FlagCard-TrackableImpressions",
      viewKey: "TRACKABLE_IMPRESSIONS",
      filters: {
        "vf_Political Advertiser Name": "Test Advertiser",
        "vf_Channel": "CTV"
      }
    },
    // ... 12 more views
  ]
  ```

### Step C: Fetch View Data (Parallel)
- **Service**: `TableauService.fetchViewsDataInParallel()`
- **Action**: 
  1. Authenticates with Tableau (cached token)
  2. Gets workbook by name
  3. Gets all views from workbook
  4. Maps view names to view IDs
  5. Fetches data for each view in parallel (concurrency: 5)
- **Output**: `Map<viewKey, rawTableauData>`
- **Authentication**: Uses dynamic credentials based on `siteName`
  - Looks for `${SITE_UPPER}_PAT_NAME` and `${SITE_UPPER}_PAT_SECRET`
  - Falls back to `TABLEAU_PAT_NAME` and `TABLEAU_PAT_SECRET`

### Step D: Error Handling
- **Service**: `ExportPptService`
- **Action**: Validates that at least one view was successfully fetched
- **On Failure**: Throws error, worker sends failure email

### Step E: Transform Data
- **Service**: `DataTransformerService.transformViewDataMap()`
- **Action**: 
  - For each view in the Map:
    - Determines view type (FlagCard vs Table)
    - Extracts values from Tableau data structure
    - Transforms to PPT format
- **Output**: `{ viewKey: transformedData }`
- **Format**:
  - Flag Cards: `{ value: "587249", format: "string" }`
  - Tables: `{ headers: [...], rows: [...] }`

### Step F: Generate PPT
- **Service**: `PptConfigService` → `PoliticalSnapshotService`
- **Action**:
  1. Merges transformed data with static defaults
  2. Creates slide configurations based on `slide-view-mapping.json`
  3. Builds PPT config object
  4. `PptBuilder` generates binary buffer
- **Output**: PPT file buffer

### Step G: Email Delivery
- **Service**: `NotificationService`
- **Action**: 
  1. Uploads PPT as attachment
  2. Sends email with attachment
- **Output**: Email sent to recipient

## Filter Mapping

Filters from API request are mapped to Tableau filter parameters:

| API Filter Key | Tableau Parameter | Example Value |
|---------------|-------------------|---------------|
| `POLITICAL_ADVERTISER_NAME` | `vf_Political Advertiser Name` | "Test Advertiser" |
| `ADVERTISER_ID_NAME` | `vf_Advertiser ID - Advertiser Name` | "12345 - Name" |
| `CHANNEL` | `vf_Channel` | "CTV" |
| `CAMPAIGN_ID_NAME` | `vf_Lab Campaign ID - Name` | "Campaign-123" |
| `INSERTION_ORDER_ID` | `vf_Insertion Order Id` | "IO-456" |

**Note**: The `vf_` prefix is added by `buildFilterParams()` in `view-config.util.js`, but based on the user's change, filters are passed directly without the prefix.

## Views Processed

For `POLITICAL_SNAPSHOT`, the following 13 views are fetched:

1. `TRACKABLE_IMPRESSIONS` (FlagCard)
2. `REACH` (FlagCard)
3. `AVG_FREQUENCY` (FlagCard)
4. `VIDEO_PERFORMANCE` (FlagCard)
5. `CLICK_PERFORMANCE` (FlagCard)
6. `TOP_CHANNEL` (FlagCard)
7. `TOP_DEVICE` (FlagCard)
8. `TOP_APP` (FlagCard)
9. `LAB_CAMPAIGN_DATA` (Table)
10. `INSERTION_ORDER_DATA` (Table)
11. `DSP_CREATIVE_DATA` (Table)
12. `CHANNEL_DATA` (Table)
13. `IMPRESSIONS_DATA` (Table)

## Error Handling

- **Tableau Auth Failure**: Retries via axios-retry, then sends failure email
- **View Fetch Failure**: Individual views fail gracefully, continues with successful ones
- **No Data Fetched**: Throws error, sends failure email
- **PPT Generation Failure**: Throws error, sends failure email
- **Email Failure**: Logs error but doesn't mask original error

## Testing

Run individual module tests:
```bash
npm run test:transformer    # DataTransformerService
npm run test:political-ppt  # PPT generation (static data)
npm run test:tableau        # TableauService (requires credentials)
npm run test:export         # Full flow (requires credentials)
```

