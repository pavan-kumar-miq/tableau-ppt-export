# Failure Analysis: "viewData is required for PPT generation"

## Error Location
**File**: `src/services/use-cases/political-snapshot.service.js`  
**Line**: 60  
**Error**: `throw new Error('viewData is required for PPT generation');`

## Failure Chain Analysis

### Flow Overview
```
1. Job Submitted → BullMQ Queue
2. Worker picks up job
3. ExportPptService.processExport()
   ├─→ Step A: Config Lookup ✅
   ├─→ Step B: Build View Configs ✅
   ├─→ Step C: Fetch View Data (TableauService) ❌ FAILING HERE
   ├─→ Step D: Check if viewDataMap.size === 0
   ├─→ Step E: Transform Data
   ├─→ Step F: Generate PPT (checks if viewData is empty) ❌ ERROR THROWN HERE
   └─→ Step G: Email Delivery
```

## Root Cause Analysis

### Scenario 1: Tableau Authentication Failure (Most Likely)
**Location**: `src/services/tableau.service.js` → `getValidToken()` or `getWorkbookByName()`

**What happens**:
1. `fetchViewsDataInParallel()` calls `getWorkbookByName(workbookName, siteName)`
2. `getWorkbookByName()` calls `getValidToken(siteName)` for authentication
3. If authentication fails:
   - Error thrown: `"Failed to fetch workbook "{workbookName}": {error.message}"`
   - This error is caught in `fetchViewsDataInParallel()` at line 584-590
   - Re-thrown as: `"Failed to fetch views data: {error.message}"`
   - This bubbles up to `export-ppt.service.js` line 73-78
   - **BUT**: If the error is caught and handled, `viewDataMap` might be empty

**Possible causes**:
- Invalid or expired Tableau PAT credentials
- Network connectivity issues to Tableau server
- Tableau server is down or unreachable
- Site name mismatch (credentials for wrong site)

### Scenario 2: All View Fetches Fail
**Location**: `src/services/tableau.service.js` → `fetchViewsDataInParallel()` lines 513-574

**What happens**:
1. Authentication succeeds
2. Workbook is found
3. Views are retrieved
4. But ALL individual view data fetches fail (lines 547-558)
5. `results` Map remains empty
6. Returns empty Map: `viewDataMap.size === 0`
7. Check at line 85-87 in `export-ppt.service.js` should catch this:
   ```javascript
   if (viewDataMap.size === 0) {
     throw new Error("No view data was successfully fetched from Tableau");
   }
   ```
8. **BUT**: If this check passes but transformation fails, we get empty `transformedData`

### Scenario 3: All Transformations Fail
**Location**: `src/services/data-transformer.service.js` → `transformViewDataMap()` lines 58-82

**What happens**:
1. `viewDataMap` has data (some views fetched successfully)
2. But `transformTableauData()` fails for ALL views
3. `transformedData` object remains empty: `{}`
4. This empty object is passed to `pptConfigService.getPptConfig()`
5. Which calls `political-snapshot.service.getPptConfig()`
6. Check at line 59-61 fails:
   ```javascript
   if (!viewData || Object.keys(viewData).length === 0) {
     throw new Error('viewData is required for PPT generation');
   }
   ```

**Possible causes**:
- Raw Tableau data format is unexpected
- Transformation logic has bugs
- View keys don't match expected format

## Current Error Handling Gaps

### Gap 1: Empty viewDataMap Not Always Caught
**Issue**: If `fetchViewsDataInParallel()` returns an empty Map but doesn't throw, the check at line 85 might not execute if there's an exception earlier.

### Gap 2: Empty transformedData Not Caught
**Issue**: If `viewDataMap` has data but all transformations fail, `transformedData` is empty `{}`, and this isn't caught before reaching `political-snapshot.service`.

### Gap 3: Silent Failures in Transformation
**Issue**: `transformViewDataMap()` silently skips failed transformations (lines 67-72), which can lead to empty `transformedData` without clear error.

## Recommended Fixes

### Fix 1: Add Validation After Transformation
**Location**: `src/services/export-ppt.service.js` after line 95

```javascript
const transformedData = dataTransformerService.transformViewDataMap(
  useCase,
  viewDataMap
);

// Add validation
if (!transformedData || Object.keys(transformedData).length === 0) {
  throw new Error(
    `No view data could be transformed. ` +
    `Fetched ${viewDataMap.size} views but all transformations failed.`
  );
}
```

### Fix 2: Improve Error Messages
**Location**: `src/services/data-transformer.service.js` line 75-79

```javascript
logger.info("View data transformation completed", {
  useCase,
  transformedViews: Object.keys(transformedData).length,
  totalViews: viewDataMap.size,
});

// Add warning if no transformations succeeded
if (Object.keys(transformedData).length === 0 && viewDataMap.size > 0) {
  logger.warn("All view transformations failed", {
    useCase,
    totalViews: viewDataMap.size,
  });
}
```

### Fix 3: Better Error Context in political-snapshot.service
**Location**: `src/services/use-cases/political-snapshot.service.js` line 59-61

```javascript
if (!viewData || Object.keys(viewData).length === 0) {
  throw new Error(
    'viewData is required for PPT generation. ' +
    'This usually means Tableau data fetching or transformation failed. ' +
    'Check logs for authentication or transformation errors.'
  );
}
```

## Debugging Steps

1. **Check Tableau Authentication**:
   ```bash
   # Test if credentials work
   npm run test:tableau
   ```

2. **Check Server Logs**:
   - Look for "Failed to fetch workbook" errors
   - Look for "Failed to fetch view data" errors
   - Look for "Failed to transform view data" errors

3. **Verify Environment Variables**:
   ```bash
   # Check if all required vars are set
   grep TABLEAU .env
   ```

4. **Test Individual Components**:
   ```bash
   # Test data flow
   npm run test:data-flow
   
   # Test transformation
   npm run test:transformer
   ```

## Most Likely Root Cause

Based on the error pattern and test results:
- **Jobs are being retried** (attempts: 1, 2, 3) - indicates transient failures
- **Error message**: "viewData is required for PPT generation" - indicates empty transformedData
- **Most likely**: Tableau API calls are failing (authentication or network), resulting in empty `viewDataMap`, which after transformation becomes empty `transformedData`

## Next Steps

1. ✅ Check server logs for detailed error messages
2. ✅ Verify Tableau credentials are valid
3. ✅ Test Tableau connectivity: `npm run test:tableau`
4. ✅ Add the validation fixes above to catch errors earlier
5. ✅ Improve error messages to include more context

