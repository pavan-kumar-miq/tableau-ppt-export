# Error Handling Analysis - Worker Processes

## Overview
This document analyzes error handling throughout the codebase, with special focus on worker processes to ensure errors are properly thrown (not just logged) so BullMQ can retry jobs correctly.

---

## ✅ CORRECT: Errors Properly Thrown

### 1. Worker Process (`src/queue/queue.provider.js`)
**Lines 77-114**
```javascript
catch (error) {
  logger.error("Job processing failed", error, {...});
  // ... send failure email logic ...
  throw error;  // ✅ CORRECT - Error is re-thrown
}
```
**Status**: ✅ **CORRECT** - Error is logged and then thrown, allowing BullMQ to retry

---

### 2. Export PPT Service (`src/services/export-ppt.service.js`)
**Lines 137-144**
```javascript
catch (error) {
  logger.error("Export job failed", error, {...});
  throw error;  // ✅ CORRECT - Error is re-thrown
}
```
**Status**: ✅ **CORRECT** - Error is logged and then thrown

---

### 3. Tableau Service - Main Methods
**All catch blocks properly throw:**
- `getValidToken()` - Line 188-194: ✅ Throws error
- `exportImage()` - Line 245-254: ✅ Throws error
- `exportData()` - Line 292-299: ✅ Throws error
- `getWorkbookByName()` - Line 401-409: ✅ Throws error
- `getWorkbookViews()` - Line 451-458: ✅ Throws error
- `fetchViewsDataInParallel()` - Line 584-590: ✅ Throws error

**Status**: ✅ **CORRECT** - All main methods properly throw errors

---

### 4. Notification Service (`src/services/notification.service.js`)
**Lines 69-74, 160-166**
```javascript
catch (error) {
  logger.error("Failed to upload attachment", error, {...});
  throw new Error(`Failed to upload attachment: ${error.message}`);  // ✅ CORRECT
}
```
**Status**: ✅ **CORRECT** - Errors are properly thrown

---

### 5. Political Snapshot Service (`src/services/use-cases/political-snapshot.service.js`)
**Lines 89-91**
```javascript
catch (error) {
  logger.error("Political Snapshot processing failed", error);
  throw error;  // ✅ CORRECT
}
```
**Status**: ✅ **CORRECT** - Error is re-thrown

---

## ⚠️ INTENTIONAL: Errors Swallowed (But Documented)

### 1. Failure Email Errors (`src/services/export-ppt.service.js`)
**Lines 173-178**
```javascript
catch (emailError) {
  logger.error("Failed to send failure notification email", emailError, {...});
  // No throw - INTENTIONAL
}
```
**Status**: ⚠️ **INTENTIONAL** - Email errors are swallowed to prevent masking the original job failure error. This is correct behavior.

---

### 2. Individual View Transformation Failures (`src/services/data-transformer.service.js`)
**Lines 67-72**
```javascript
catch (error) {
  logger.error("Failed to transform view data", error, {...});
  // No throw - INTENTIONAL (individual view failures are skipped)
}
```
**Status**: ⚠️ **INTENTIONAL BUT POTENTIALLY PROBLEMATIC**

**Issue**: If ALL view transformations fail, `transformedData` will be empty `{}`, which will cause an error later in `political-snapshot.service.js` (line 60). However, this error will be thrown, so the job will fail correctly.

**Recommendation**: Add validation after transformation to catch this earlier with a clearer error message.

---

### 3. Individual View Data Fetch Failures (`src/services/tableau.service.js`)
**Lines 547-558**
```javascript
catch (error) {
  logger.error("Failed to fetch view data", error, {...});
  return {
    viewKey,
    viewName,
    success: false,
    error: error.message,
  };
  // No throw - INTENTIONAL (individual view failures are skipped)
}
```
**Status**: ⚠️ **INTENTIONAL** - Individual view failures are handled gracefully. If ALL views fail, `viewDataMap.size === 0` and an error is thrown at line 86 in `export-ppt.service.js`.

---

## 🔴 POTENTIAL ISSUE: Missing Validation

### Issue: Empty Transformed Data Not Validated
**Location**: `src/services/export-ppt.service.js` after line 95

**Current Code**:
```javascript
const transformedData = dataTransformerService.transformViewDataMap(
  useCase,
  viewDataMap
);

// No validation here - if all transformations fail, transformedData is {}
const pptConfig = await pptConfigService.getPptConfig({
  useCase,
  filters,
  viewData: transformedData,  // Could be empty {}
});
```

**Problem**: If all transformations fail silently, `transformedData` will be `{}`, and the error will only be thrown later in `political-snapshot.service.js` with a less clear message.

**Recommendation**: Add validation after transformation:
```javascript
const transformedData = dataTransformerService.transformViewDataMap(
  useCase,
  viewDataMap
);

// Add validation
if (!transformedData || Object.keys(transformedData).length === 0) {
  throw new Error(
    `No view data could be transformed. ` +
    `Fetched ${viewDataMap.size} views but all transformations failed. ` +
    `Check logs for transformation errors.`
  );
}
```

---

## Summary

### ✅ Correct Error Handling
- Worker process properly throws errors
- Main service methods properly throw errors
- Critical paths properly throw errors

### ⚠️ Intentional Error Swallowing
- Failure email errors (correct - shouldn't mask original error)
- Individual view transformation failures (acceptable, but could be improved)
- Individual view fetch failures (acceptable - handled at higher level)

### 🔴 Recommended Fix
- Add validation after `transformViewDataMap()` to catch empty transformed data early

---

## Testing Recommendations

1. **Test with all view transformations failing**: Should fail with clear error
2. **Test with all view fetches failing**: Should fail at line 86 in export-ppt.service.js
3. **Test with partial failures**: Should succeed if at least one view succeeds
4. **Test failure email errors**: Should not mask original job failure

---

## Conclusion

**Overall Status**: ✅ **GOOD** - Most error handling is correct. The worker process properly throws errors, allowing BullMQ to retry jobs.

**Minor Improvement**: Add validation after transformation to provide clearer error messages when all transformations fail.

