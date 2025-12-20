# API Examples

## End-to-End Flow

The Political Snapshot PPT export follows this flow:

1. **API Request** → `POST /api/v1/jobs`
2. **Job Queued** → Redis queue
3. **Worker Processing**:
   - Config lookup (usecase-mapping.json)
   - Tableau authentication
   - Parallel view data fetching
   - Data transformation
   - PPT generation
   - Email delivery

## Sample cURL Request

### Submit Export Job

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "useCase": "POLITICAL_SNAPSHOT",
    "email": "recipient@example.com",
    "filters": {
      "POLITICAL_ADVERTISER_NAME": "Test Advertiser",
      "ADVERTISER_ID_NAME": "12345 - Advertiser Name",
      "CHANNEL": "CTV",
      "CAMPAIGN_ID_NAME": "Campaign-123 - Campaign Name",
      "INSERTION_ORDER_ID": "IO-456"
    }
  }'
```

### Response

```json
{
  "message": "Export job queued successfully",
  "jobId": "1234567890-abc123"
}
```

### Check Job Status

```bash
curl http://localhost:3000/api/v1/jobs/1234567890-abc123
```

### Response

```json
{
  "jobId": "1234567890-abc123",
  "status": "completed",
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:01:00.000Z",
  "startedAt": "2024-01-01T00:00:30.000Z",
  "completedAt": "2024-01-01T00:01:00.000Z",
  "result": {
    "success": true,
    "fileName": "tableau-export-1234567890.pptx",
    "email": "recipient@example.com",
    "useCase": "POLITICAL_SNAPSHOT",
    "viewsProcessed": 13
  }
}
```

## Filter Keys

Based on `tableau-views.json`, the available filter keys are:

- `POLITICAL_ADVERTISER_NAME` - Political Advertiser Name
- `ADVERTISER_ID_NAME` - Advertiser ID - Advertiser Name
- `CHANNEL` - Channel
- `CAMPAIGN_ID_NAME` - Lab Campaign ID - Name
- `INSERTION_ORDER_ID` - Insertion Order Id

All filters are optional. You can provide any combination of them.

## Minimal Request (No Filters)

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "useCase": "POLITICAL_SNAPSHOT",
    "email": "recipient@example.com",
    "filters": {}
  }'
```

## Queue Statistics

```bash
curl http://localhost:3000/api/v1/jobs/queue/stats
```

## Cleanup Stuck Jobs

```bash
curl -X POST http://localhost:3000/api/v1/jobs/queue/cleanup
```

