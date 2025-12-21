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

- **API Server** (`server.js`): Express.js REST API for job submission and status, with integrated BullMQ worker
- **BullMQ Queue** (`src/queue/queue.provider.js`): Redis-based job queue using BullMQ for reliable job processing
- **Worker**: Integrated into the REST service - processes jobs in the same process (horizontal scaling via multiple instances)
- **Redis**: Job queue and state management (via BullMQ)
- **Tableau API**: Fetches views/images from Tableau Server
- **Email Service**: Sends notifications via external API

### Architecture Benefits

- **Simplified Deployment**: Single process handles both API and worker logic
- **Horizontal Scaling**: Deploy multiple instances behind a load balancer - each instance processes jobs
- **Reliability**: BullMQ provides automatic retries, job persistence, and stuck job handling
- **Concurrency Control**: Configurable concurrency per instance via `QUEUE_CONCURRENCY` environment variable

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

### Start Service (API + Worker)

The service now runs both the REST API and worker in a single process:

```bash
npm start
# or for development
npm run dev
```

**Note**: The worker is automatically started when the server starts. No separate worker process is needed.

### Horizontal Scaling

To scale horizontally, simply deploy multiple instances of the service behind a load balancer. Each instance will:
- Accept API requests
- Process jobs from the shared Redis queue
- Automatically distribute workload across instances

Example with Docker/Kubernetes:
```bash
# Deploy 3 instances
kubectl scale deployment tableau-ppt-export --replicas=3
```

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
├── server.js              # API server entry point (includes worker initialization)
├── src/
│   ├── app.js            # Express app setup
│   ├── controllers/      # Request handlers
│   ├── routes/          # API routes
│   ├── queue/           # BullMQ queue configuration
│   │   └── queue.provider.js  # Queue and worker setup
│   ├── services/        # Business logic
│   │   ├── use-cases/   # Use-case specific services
│   │   ├── export-ppt.service.js
│   │   ├── tableau.service.js
│   │   └── notification.service.js
│   └── utils/           # Utilities
│       ├── pptx-helpers.util.js          # PptxGenJS helper functions
│       ├── pptx-helpers.examples.js      # Usage examples
│       ├── ppt-builder.util.js           # PPT builder
│       └── logger.util.js                # Logger
├── docs/
│   ├── PPTX_HELPERS_GUIDE.md    # Comprehensive helper guide
│   └── PPTX_QUICK_REFERENCE.md  # Quick reference card
└── package.json
```

## PptxGenJS Helper Utilities

This project includes comprehensive helper utilities for creating PowerPoint presentations with PptxGenJS. These utilities provide:

- **Constants**: Pre-defined values for layouts, colors, fonts, chart types, and more
- **Helper Functions**: Easy-to-use functions for creating text, charts, tables, images, and backgrounds
- **Type-Safe API**: Structured options that reduce errors and improve code readability

### Quick Example

```javascript
const {
  COLORS,
  FONT_SIZE,
  ALIGN,
  createTitleText,
  createBarChart,
  createTableHeaderRow,
} = require("./utils/pptx-helpers.util");

// Create a title
const titleProps = createTitleText("Q4 Sales Report", {
  color: COLORS.NAVY,
});

// Create a bar chart
const chartConfig = createBarChart(
  ["Q1", "Q2", "Q3", "Q4"],
  [100, 150, 180, 220],
  {
    title: "Quarterly Performance",
    chartColors: [COLORS.BLUE, COLORS.GREEN, COLORS.ORANGE],
    showValue: true,
  }
);

// Create a table header
const headers = createTableHeaderRow(["Product", "Sales", "Growth"], {
  fill: { color: COLORS.NAVY },
  color: COLORS.WHITE,
});
```

### Documentation

- **[Complete Guide](docs/PPTX_HELPERS_GUIDE.md)**: Comprehensive documentation with all functions and constants
- **[Quick Reference](docs/PPTX_QUICK_REFERENCE.md)**: Quick reference card for common patterns
- **[Examples](src/utils/pptx-helpers.examples.js)**: Working examples for all components

### Features

- ✅ **Constants** for colors, fonts, layouts, chart types, alignments
- ✅ **Text helpers** - titles, subtitles, bullets, custom text
- ✅ **Chart helpers** - bar, line, pie charts with full customization
- ✅ **Table helpers** - headers, cells, auto-paging tables
- ✅ **Image helpers** - images with sizing, rotation, effects
- ✅ **Background helpers** - color and image backgrounds
- ✅ **Style helpers** - borders, shadows, hyperlinks, fills

## Development

```bash
# Run server with auto-reload (includes worker)
npm run dev
```

## License

ISC
