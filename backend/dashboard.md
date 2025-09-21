# Dashboard API Documentation

## Overview
The Dashboard API provides analytics and reporting endpoints for the MARS system. These endpoints aggregate data from various system tables to provide insights and trends for management decision-making.

## Authentication
All dashboard endpoints require JWT authentication via Bearer token. Use the "Authorize" button in Swagger UI to set your token.

## Endpoints

### 1. Work Order Volume Trend

**Endpoint:** `GET /api/dashboard/workorder-volume-trend`

**Description:** Returns aggregated work order counts over time with filtering options. Supports daily, weekly, and monthly grouping with filters for work order type, department, site, and assignment.

**Parameters:**
- `startDate` (optional): Start date for filtering (YYYY-MM-DD format)
- `endDate` (optional): End date for filtering (YYYY-MM-DD format)
- `groupBy` (optional): Grouping interval - `daily`, `weekly`, or `period` (default: `daily`)
- `woType` (optional): Filter by work order type ID
- `department` (optional): Filter by department ID
- `site` (optional): Filter by site ID
- `assign` (optional): Filter by assigned user ID

**Period System:**
- Each period (P) is 28 days (4 weeks)
- Periods start from the first Sunday of the year
- Weeks start on Sunday and end on Saturday
- Example: If January 1st, 2025 is Wednesday, then P1 period is Dec 29, 2024 - Jan 27, 2025

**Response Format:**
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "date": "2024-01-15",
        "count": 25,
        "periodStart": "2024-01-15",
        "periodEnd": "2024-01-15"
      }
    ],
    "filters": {
      "woTypes": [
        {
          "id": 1,
          "code": "CM",
          "name": "Corrective Maintenance"
        }
      ],
      "departments": [
        {
          "id": 1,
          "code": "PROD",
          "name": "Production"
        }
      ],
      "sites": [
        {
          "id": 1,
          "code": "SITE1",
          "name": "Main Site"
        }
      ]
    },
    "summary": {
      "totalWorkOrders": 150,
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      },
      "groupBy": "daily",
      "appliedFilters": {
        "woType": 1,
        "department": 2,
        "site": 1,
        "assign": 21
      }
    }
  }
}
```

**Example Usage:**

1. **Daily trend for last 30 days:**
   ```
   GET /api/dashboard/workorder-volume-trend?startDate=2024-01-01&endDate=2024-01-31&groupBy=daily
   ```

2. **Weekly trend with department filter:**
   ```
   GET /api/dashboard/workorder-volume-trend?startDate=2024-01-01&endDate=2024-12-31&groupBy=weekly&department=2
   ```

3. **Period trend with multiple filters:**
   ```
   GET /api/dashboard/workorder-volume-trend?startDate=2024-01-01&endDate=2024-12-31&groupBy=period&woType=1&site=1
   ```

**X-Axis Label Format:**
- **Daily**: Date format (e.g., "Jan 15")
- **Weekly**: P..W.. format (e.g., "P2024W01")
- **Period**: Month name (e.g., "Jan 2024")

**Data Source:**
- Primary table: `WO` (Work Orders)
- Related tables: `WOType`, `Dept`, `Site`, `Person`
- Filters out deleted records (`FLAGDEL = 'F'`)

**Frontend Integration:**
This endpoint is designed to work with line chart libraries like Chart.js, D3.js, or Recharts. The trend data provides:
- X-axis: Date/period values
- Y-axis: Work order counts
- Additional metadata for tooltips and legends

**Error Handling:**
- `400`: Invalid parameters (e.g., invalid groupBy value)
- `401`: Authentication required
- `500`: Internal server error

## Testing

Use the provided test script to verify the endpoint functionality:

```bash
cd backend
node test_dashboard_endpoint.js
```

Make sure to:
1. Update the `TEST_TOKEN` variable with a valid JWT token
2. Ensure the backend server is running on port 3001
3. Have proper database connectivity

## Future Endpoints

Additional dashboard endpoints planned:
- Work Order Status Distribution
- Equipment Performance Metrics
- Maintenance Cost Analysis
- Personnel Workload Analysis
- Site Performance Comparison
