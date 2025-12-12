# Tableau to PowerPoint Export Service

Enterprise service for exporting Tableau views to PowerPoint presentations with job queue processing.

## Overview

This service provides an asynchronous job queue system that:
- Accepts export requests via REST API
- Queues jobs in Redis
- Processes exports in background workers
- Fetches images/data from Tableau Server
- Generates PowerPoint presentations
- Sends email notifications with attachments

## Architecture

- **API Server** (`server.js`): Express.js REST API for job submission and status
- **Worker** (`worker.js`): Background worker that processes queued jobs
- **Redis**: Job queue and state management
- **Tableau API**: Fetches views/images from Tableau Server
- **Email Service**: Sends notifications via external API

## Prerequisites

- Node.js 24.11.1
- Redis server
- Tableau Server access (PAT credentials)
- Email notification API access

## Installation

```bash
npm install
```

## Configuration

Copy `.env-example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development

# Redis Config
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_CONCURRENCY=2
QUEUE_ATTEMPTS=3

# Tableau Config
TABLEAU_BASE_URL=https://your-tableau-server.com
TABLEAU_PAT_NAME=your-pat-name
TABLEAU_PAT_SECRET=your-pat-secret

# Notification Config
NOTIFICATION_API_URL=https://your-notification-api.com
API_GATEWAY_TOKEN=your-api-token
EMAIL_FROM=noreply@example.com
EMAIL_TEAM_TAG=your-team
EMAIL_PRODUCT_TAG=your-product
TEST_EMAIL=test@example.com
```

## Running the Service

### Start API Server
```bash
npm start
# or for development
npm run dev
```

### Start Worker (separate process)
```bash
npm run worker
# or for development
npm run worker:dev
```

Both processes must be running for the service to function.

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes Redis)
- `GET /health/live` - Liveness check

### Job Management
- `POST /api/v1/jobs` - Submit export job
- `GET /api/v1/jobs/:jobId` - Get job status
- `GET /api/v1/jobs/queue/stats` - Get queue statistics

### Submit Export Job

```bash
POST /api/v1/jobs
Content-Type: application/json

{
  "viewIds": ["view-id-1", "view-id-2"],
  "email": "recipient@example.com",
  "siteName": "miqdigital-us",
  "filters": {
    "filter-key": "filter-value"
  },
  "config": {
    "useCase": "POLITICAL_SNAPSHOT",
    "title": "Custom Report Title",
    "emailSubject": "Your Report",
    "emailBody": "<p>Report attached</p>"
  }
}
```

**Required Fields:**
- `viewIds`: Array of Tableau view IDs
- `email`: Recipient email address
- `siteName`: Tableau site name (valid sites: miqdigital-us, miqdigital-anz, miqdigital-ca, miqdigital-emea, miqdigital-sea, miqdigital-global, miqdigital-integration, miqdigital-internal)

**Response:**
```json
{
  "message": "Export job queued successfully",
  "jobId": "1234567890-abc123",
  "status": "pending"
}
```

### Get Job Status

```bash
GET /api/v1/jobs/:jobId
```

**Response:**
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
    "viewsProcessed": 2
  }
}
```

## Use Cases

Currently supported use cases:
- `POLITICAL_SNAPSHOT`: Exports political snapshot views to PowerPoint

## Job Status

- `pending`: Job queued, waiting for processing
- `processing`: Job currently being processed
- `completed`: Job completed successfully
- `failed`: Job failed after max attempts

## Project Structure

```
├── server.js              # API server entry point
├── worker.js              # Worker entry point
├── src/
│   ├── app.js            # Express app setup
│   ├── controllers/      # Request handlers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── use-cases/   # Use-case specific services
│   │   ├── job.service.js
│   │   ├── export-ppt.service.js
│   │   ├── tableau.service.js
│   │   └── notification.service.js
│   └── utils/           # Utilities
└── package.json
```

## Development

```bash
# Run server with auto-reload
npm run dev

# Run worker with auto-reload
npm run worker:dev
```

## License

ISC
