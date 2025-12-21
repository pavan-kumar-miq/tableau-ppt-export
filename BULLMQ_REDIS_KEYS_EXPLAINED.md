# BullMQ Redis Keys Explained

## Overview
BullMQ stores job data and queue metadata in Redis using a specific key naming convention: `bull:{queue-name}:{suffix}`

For your queue `tableau-ppt-export`, all keys are prefixed with `bull:tableau-ppt-export:`

---

## Key Types and Their Purpose

### 1. Individual Job Keys (Hash)
**Format**: `bull:tableau-ppt-export:{jobId}`  
**Type**: Hash  
**Examples**: 
- `bull:tableau-ppt-export:1`
- `bull:tableau-ppt-export:2`
- `bull:tableau-ppt-export:7`

**Purpose**: Stores complete job data including:
- `name`: Job name (e.g., "political-snapshot")
- `data`: Job payload (JSON string)
- `opts`: Job options (attempts, backoff, cleanup settings)
- `timestamp`: When job was created
- `finishedOn`: When job completed/failed
- `failedReason`: Error message if job failed
- `stacktrace`: Error stack trace
- `ats`: Attempts made
- `atm`: Max attempts

**Lifecycle**:
- Created when job is added
- Updated as job progresses
- **Removed after cleanup period**:
  - Completed jobs: After 24 hours (or when > 1000 completed jobs)
  - Failed jobs: After 7 days

---

### 2. Failed Jobs Set (Sorted Set)
**Format**: `bull:tableau-ppt-export:failed`  
**Type**: Sorted Set (ZSET)  
**Content**: Job IDs of all failed jobs

**Purpose**: 
- Tracks which jobs have failed
- Used for retry logic and monitoring
- Sorted by failure timestamp

**Current Content** (from your Redis):
```
2, 1, 3, 5, 6, 4, 7
```
All 7 jobs have failed (due to Tableau API issues).

**Lifecycle**:
- Job ID added when job fails after max attempts
- **Removed after 7 days** (based on `removeOnFail.age`)

---

### 3. Queue Metadata (Hash)
**Format**: `bull:tableau-ppt-export:meta`  
**Type**: Hash  
**Content**: Queue configuration and metadata

**Current Content**:
```
opts.maxLenEvents: 10000
version: bullmq:5.65.1
```

**Purpose**:
- Stores queue-level settings
- Tracks BullMQ version
- Configuration for event stream length

**Lifecycle**: Persists as long as queue exists

---

### 4. Job ID Counter (String)
**Format**: `bull:tableau-ppt-export:id`  
**Type**: String  
**Current Value**: `7`

**Purpose**: 
- Auto-incrementing counter for generating unique job IDs
- Next job will get ID `8`, then `9`, etc.

**Lifecycle**: Persists and increments forever

---

### 5. Events Stream (Stream)
**Format**: `bull:tableau-ppt-export:events`  
**Type**: Redis Stream  
**Purpose**: 
- Real-time event stream for job lifecycle events
- Used for monitoring, logging, and UI dashboards
- Events include: `completed`, `failed`, `active`, `waiting`, etc.

**Lifecycle**: 
- Max length: 10,000 events (from `opts.maxLenEvents`)
- Older events are automatically trimmed

---

### 6. Stalled Check (Set)
**Format**: `bull:tableau-ppt-export:stalled-check`  
**Type**: Set  
**Purpose**: 
- Tracks jobs that might be "stuck" or stalled
- Used by BullMQ's stalled job detection mechanism
- Helps recover from worker crashes

**Lifecycle**: 
- Jobs added when processing starts
- Removed when job completes or fails
- Automatically cleaned up

---

## Why Are These Keys Still in Redis?

### Failed Jobs (1-7)
All your jobs failed, so they're stored in Redis because:
- `removeOnFail.age: 7 * 24 * 60 * 60` (7 days)
- Jobs will be automatically cleaned up after 7 days
- This allows you to:
  - Inspect failed jobs
  - Debug issues
  - Manually retry if needed

### Active/Processing Jobs
If jobs are currently processing, they'll have keys until they complete.

### Completed Jobs
Completed jobs are kept for 24 hours (or max 1000), then automatically removed.

---

## Cleanup Configuration

From your `queue.provider.js`:

```javascript
removeOnComplete: {
  age: 24 * 60 * 60,  // 24 hours
  count: 1000,         // Keep last 1000 completed jobs
},
removeOnFail: {
  age: 7 * 24 * 60 * 60,  // 7 days
},
```

**What this means**:
- ✅ Completed jobs: Removed after 24 hours OR when > 1000 completed jobs exist
- ✅ Failed jobs: Removed after 7 days
- ✅ Active/Processing jobs: Removed immediately after completion/failure

---

## Manual Cleanup (If Needed)

### Remove All Failed Jobs
```bash
# Get all failed job IDs
redis-cli ZRANGE "bull:tableau-ppt-export:failed" 0 -1

# Remove specific job
redis-cli DEL "bull:tableau-ppt-export:1"

# Remove from failed set
redis-cli ZREM "bull:tableau-ppt-export:failed" 1
```

### Remove All Queue Data (⚠️ DANGEROUS)
```bash
# Remove all keys for this queue
redis-cli --scan --pattern "bull:tableau-ppt-export:*" | xargs redis-cli DEL
```

### Clean Up Old Failed Jobs (Keep only recent)
```bash
# This would require a script to check timestamps and remove old ones
# Better to let BullMQ handle it automatically
```

---

## Monitoring Commands

### Count Jobs by Status
```bash
# Failed jobs count
redis-cli ZCARD "bull:tableau-ppt-export:failed"

# Active jobs (check individual job keys for status)
redis-cli KEYS "bull:tableau-ppt-export:*" | grep -E "^bull:tableau-ppt-export:[0-9]+$" | wc -l
```

### View Job Details
```bash
# View specific job
redis-cli HGETALL "bull:tableau-ppt-export:1"

# View job data only
redis-cli HGET "bull:tableau-ppt-export:1" data
```

### Check Queue Health
```bash
# Next job ID (shows how many jobs have been created)
redis-cli GET "bull:tableau-ppt-export:id"

# Queue metadata
redis-cli HGETALL "bull:tableau-ppt-export:meta"
```

---

## Summary

| Key | Type | Purpose | Lifecycle |
|-----|------|---------|-----------|
| `bull:tableau-ppt-export:{id}` | Hash | Individual job data | 24h (completed) / 7d (failed) |
| `bull:tableau-ppt-export:failed` | ZSet | Failed job IDs | 7 days |
| `bull:tableau-ppt-export:meta` | Hash | Queue metadata | Persistent |
| `bull:tableau-ppt-export:id` | String | Job ID counter | Persistent |
| `bull:tableau-ppt-export:events` | Stream | Event stream | Max 10k events |
| `bull:tableau-ppt-export:stalled-check` | Set | Stalled job detection | Temporary |

**Your Current State**:
- 7 failed jobs (IDs: 1-7) stored in Redis
- All will be auto-cleaned after 7 days
- Next job will get ID: 8
- This is **normal behavior** - BullMQ is working as designed!

---

## Why This is Good

1. **Debugging**: Failed jobs are preserved so you can investigate
2. **Monitoring**: Can track failure patterns
3. **Recovery**: Can manually retry failed jobs if needed
4. **Automatic Cleanup**: Old jobs are removed automatically
5. **No Memory Leaks**: Cleanup prevents Redis from filling up

The keys you see are **expected and normal** for a production BullMQ setup! 🎯

