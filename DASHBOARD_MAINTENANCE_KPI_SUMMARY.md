# Dashboard Maintenance KPI - Feature Summary

## Overview

The Dashboard Maintenance KPI feature provides a comprehensive work order volume trend analysis with flexible filtering and grouping options. It displays work order counts over time using interactive line charts with support for custom period systems and advanced filtering capabilities.

## Architecture

### Backend (Node.js + Express + MSSQL)
- **Controller**: `backend/src/controllers/dashboardController.js`
- **Service**: `backend/src/services/dashboardService.ts` (Frontend)
- **API Endpoint**: `/api/dashboard/workorder-volume-trend`
- **Database**: MSSQL with `mssql` package
- **Documentation**: OpenAPI 3.0.3 (Swagger)

### Frontend (React + TypeScript + Recharts)
- **Component**: `frontend/src/pages/dashboard/DashboardMaintenanceKPIPage.tsx`
- **Service**: `frontend/src/services/dashboardService.ts`
- **Chart Library**: Recharts (LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend)
- **UI Components**: Custom components from `@/components/ui/`

## Core Features

### 1. Time Grouping Options
- **Daily**: Shows work orders by individual days
- **Weekly**: Groups by weeks with custom period calculation
- **Period**: Custom 28-day periods starting from first Sunday of the year

### 2. Custom Period System
The system implements a unique period calculation:
- **Period Length**: 28 days
- **Start Point**: First Sunday of the week containing New Year's Day
- **Week Structure**: Sunday to Saturday
- **Naming Convention**: P1, P2, P3... (P1W1, P1W2, P1W3, P1W4)

#### Period Calculation Logic
```javascript
// Example: If Jan 1, 2025 is Wednesday
// P1 period: Dec 29, 2024 - Jan 26, 2025
// P1W1: Dec 29 - Jan 4, P1W2: Jan 5 - Jan 11, etc.
```

### 3. Advanced Filtering
- **WOType**: Filter by work order type (CM, PM, EM, etc.)
- **Department**: Filter by department
- **Site**: Filter by site location
- **Assignee**: Searchable combobox with personnel data

### 4. Date Range Selection
- **Daily Grouping**: Calendar date pickers (start/end date)
- **Weekly Grouping**: Year selector + Period range (from/to)
- **Period Grouping**: Year range selector (from year to year)

## Backend Implementation

### API Endpoint
```
GET /api/dashboard/workorder-volume-trend
```

### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | string | Start date (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | End date (YYYY-MM-DD) | `2024-12-31` |
| `groupBy` | string | Grouping type: `daily`, `weekly`, `period` | `daily` |
| `woType` | integer | Filter by work order type ID | `1` |
| `department` | integer | Filter by department ID | `2` |
| `site` | integer | Filter by site ID | `1` |
| `assign` | integer | Filter by assignee ID | `21` |
| `year` | string | Year for weekly grouping | `2024` |
| `fromPeriod` | string | Start period for weekly grouping | `1` |
| `toPeriod` | string | End period for weekly grouping | `5` |
| `fromYear` | string | Start year for period grouping | `2023` |
| `toYear` | string | End year for period grouping | `2024` |

### Response Structure
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "date": "2024-01-15",
        "count": 25,
        "periodStart": "2024-01-15",
        "periodEnd": "2024-01-15",
        "year": 2024,
        "week": 3,
        "month": 1
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
      "departments": [...],
      "sites": [...]
    },
    "periodInfo": {
      "2024": {
        "firstSunday": "2023-12-31",
        "periods": [
          {
            "period": 1,
            "startDate": "2023-12-31",
            "endDate": "2024-01-27",
            "label": "P01"
          }
        ]
      }
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

### Database Schema
The API queries the following tables:
- **WO**: Main work orders table
- **WOType**: Work order types
- **Dept**: Departments
- **Site**: Sites

### Key Functions

#### `getWorkOrderVolumeTrend(req, res)`
Main controller function that:
1. Validates query parameters
2. Builds dynamic SQL queries based on grouping type
3. Handles period-to-date conversion
4. Processes and transforms data
5. Fills missing periods with zero counts
6. Returns formatted response

#### `getDateRangeFromPeriods(year, fromPeriod, toPeriod)`
Converts period ranges to actual date ranges for SQL queries.

#### `groupDailyDataByPeriods(dailyData, year)`
Groups daily data into custom periods for period-based grouping.

#### `fillMissingPeriods(trendData, groupBy, year, fromPeriod, toPeriod, fromYear, toYear)`
Ensures all periods in the range have data points (fills gaps with zero counts).

## Frontend Implementation

### Component Structure
```typescript
const DashboardMaintenanceKPIPage: React.FC = () => {
  // State management
  const [groupBy, setGroupBy] = useState<GroupBy>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [woType, setWoType] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [site, setSite] = useState<string>('');
  const [assign, setAssign] = useState<string>('');
  
  // Data state
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [periodInfo, setPeriodInfo] = useState<Record<string, any>>({});
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Personnel data for assignee filter
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState<boolean>(false);
}
```

### Key Functions

#### `load(params?)`
Main data loading function that:
1. Calculates date ranges based on grouping type
2. Makes API call to backend
3. Processes response data
4. Updates component state
5. Handles errors gracefully

#### `formatXAxisLabel(value, groupBy)`
Formats X-axis labels based on grouping type:
- **Daily**: MM/DD format
- **Weekly**: P..W.. format (e.g., P1W2)
- **Period**: P.. format with year indicator for first period

#### `formatDateForChart(dateString)`
Converts date strings to consistent YYYY-MM-DD format for chart rendering.

### Chart Implementation
Uses Recharts library with:
- **ResponsiveContainer**: Makes chart responsive
- **LineChart**: Main chart component
- **XAxis**: Custom formatted labels
- **YAxis**: Integer values only
- **CartesianGrid**: Grid lines
- **Tooltip**: Interactive tooltips
- **Legend**: Chart legend
- **Line**: Single blue line for work orders

### UI Components

#### Filter Section
- **Group By Selector**: Daily/Weekly/Period dropdown
- **Date Range Selectors**: Conditional based on grouping type
- **Filter Dropdowns**: WOType, Department, Site
- **Assignee Combobox**: Searchable personnel selector
- **Apply Button**: Triggers data refresh

#### Chart Section
- **Loading State**: Shows loading spinner
- **Empty State**: Shows "No data available" message
- **Chart Container**: Responsive chart with proper margins

#### Summary Cards
- **Total Work Orders**: Displays total count

## Data Flow

1. **User Interaction**: User selects filters and clicks "Apply"
2. **Frontend Processing**: Component calculates date ranges and builds API parameters
3. **API Call**: Frontend calls backend endpoint with parameters
4. **Backend Processing**: Controller validates parameters, builds SQL query, executes query
5. **Data Transformation**: Backend processes raw data, fills missing periods, formats response
6. **Frontend Rendering**: Component receives data, transforms for chart, updates UI
7. **Chart Display**: Recharts renders interactive line chart

## Configuration

### Environment Variables
```bash
# Backend
DB_SERVER=localhost
DB_DATABASE=your_database
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=1433

# Frontend
VITE_API_URL=http://localhost:3001/api
```

### Dependencies

#### Backend
```json
{
  "mssql": "^9.0.0",
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "swagger-jsdoc": "^6.2.0",
  "swagger-ui-express": "^4.6.0",
  "yamljs": "^0.3.0"
}
```

#### Frontend
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "recharts": "^2.8.0",
  "axios": "^1.4.0",
  "@radix-ui/react-select": "^1.2.0",
  "@radix-ui/react-dialog": "^1.0.0"
}
```

## API Documentation

The API is documented using OpenAPI 3.0.3 specification in:
- **File**: `backend/swagger/work-request-api.yaml`
- **Endpoint**: `/api-docs` (when server is running)
- **Interactive UI**: Swagger UI available at `/api-docs`

## Testing

### Backend Testing
- **File**: `backend/test_dashboard_endpoints.js`
- **Coverage**: All query parameters, grouping types, error handling
- **Run**: `node test_dashboard_endpoints.js`

### Frontend Testing
- **Manual Testing**: All filter combinations, grouping types, date ranges
- **Browser Testing**: Chrome, Firefox, Safari compatibility
- **Responsive Testing**: Mobile, tablet, desktop layouts

## Performance Considerations

### Backend
- **SQL Optimization**: Indexed columns for filtering
- **Query Caching**: Consider implementing Redis for frequently accessed data
- **Pagination**: For large datasets, implement pagination
- **Connection Pooling**: MSSQL connection pooling for better performance

### Frontend
- **Memoization**: `useMemo` for chart data transformation
- **Debouncing**: Consider debouncing filter changes
- **Lazy Loading**: Load personnel data on demand
- **Error Boundaries**: Implement error boundaries for better UX

## Security

### Authentication
- **JWT Tokens**: Required for all API calls
- **Middleware**: `authenticateToken` middleware validates requests
- **Headers**: Authorization header with Bearer token

### Data Validation
- **Input Sanitization**: All query parameters validated
- **SQL Injection**: Parameterized queries prevent SQL injection
- **XSS Protection**: Frontend sanitizes user inputs

## Deployment

### Backend
```bash
cd backend
npm install
npm start
# Server runs on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Development server runs on port 5173
```

### Production
```bash
# Backend
npm run build
npm start

# Frontend
npm run build
npm run preview
```

## Troubleshooting

### Common Issues

#### 1. Chart Not Rendering
- **Cause**: Invalid date format in data
- **Solution**: Check `formatDateForChart` function and data structure

#### 2. Period Calculation Errors
- **Cause**: Timezone issues in date calculations
- **Solution**: Ensure UTC+7 timezone handling in period functions

#### 3. API Connection Issues
- **Cause**: Incorrect API URL or CORS configuration
- **Solution**: Check `VITE_API_URL` and backend CORS settings

#### 4. Personnel Search Not Working
- **Cause**: API endpoint mismatch or authentication issues
- **Solution**: Verify personnel service configuration

### Debug Logging
- **Frontend**: Console logs in browser dev tools
- **Backend**: Console logs in server terminal
- **API**: Response logging in controller functions

## Future Enhancements

### Potential Features
1. **Export Functionality**: PDF/Excel export of chart data
2. **Real-time Updates**: WebSocket integration for live data
3. **Advanced Analytics**: Trend analysis, forecasting
4. **Custom Dashboards**: User-configurable dashboard layouts
5. **Mobile App**: React Native version
6. **Offline Support**: PWA capabilities

### Technical Improvements
1. **Caching**: Implement Redis caching for better performance
2. **Database Optimization**: Query optimization and indexing
3. **Error Handling**: Comprehensive error handling and user feedback
4. **Accessibility**: WCAG compliance improvements
5. **Internationalization**: Multi-language support

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies (`npm install` in both frontend and backend)
3. Configure environment variables
4. Start development servers
5. Access application at `http://localhost:5173`

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Code formatting
- **Git**: Conventional commit messages

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description
5. Code review and approval
6. Merge to main branch

## Support

### Documentation
- **API Docs**: `/api-docs` endpoint
- **Code Comments**: Inline documentation
- **README Files**: Component-specific documentation

### Contact
- **Development Team**: [Team Contact Information]
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

---

*Last Updated: [Current Date]*
*Version: 1.0.0*
*Maintainer: [Developer Name]*
