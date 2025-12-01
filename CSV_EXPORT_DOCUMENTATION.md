# CSV Export Feature Documentation

## Overview

The CSV Export feature allows administrators to download comprehensive barangay data summaries filtered by date ranges (day, week, month, or year). This feature aggregates data from multiple collections including residents, households, payments, financial transactions, document requests, and blockchain records.

## Features

### 1. Date Range Filtering
- **Day**: Export data for a specific day
- **Week**: Export data for a specific week
- **Month**: Export data for a specific month
- **Year**: Export data for a specific year

### 2. Comprehensive Data Aggregation

The CSV export includes the following data categories:

#### General Information
- Barangay name
- Municipality
- Report date range (start and end)

#### Residents Demographics
- Total population
- New residents in date range
- Gender distribution (male/female)
- Age groups (0-12, 13-17, 18-59, 60+)
- Registered voters count
- Employment status (employed/unemployed)
- Students count
- PWD (Person with Disability) count
- Senior citizens count
- Solo parents count

#### Households
- Total households
- New households in date range
- Average household size
- Households with unpaid fees

#### Fee Collections
- Garbage fees collected
- Garbage fees unpaid
- Streetlight fees collected
- Streetlight fees unpaid
- Fee compliance rate (percentage)

#### Financial Data
- Total income
- Total expenses
- Net balance

#### Document Requests
- Total document requests
- Barangay clearance count
- Certificate of indigency count
- Certificate of residency count
- Business clearance count
- Completed requests
- Pending requests
- Revenue from document requests
- Most requested document type

#### Blockchain Records
- Total blockchain records
- Verified ledger entries

## Implementation

### Backend Implementation

#### File Structure
```
back/
├── controllers/
│   └── exportController.js       # Main export logic
├── routes/
│   └── exportRoutes.js           # API route definitions
└── server.js                      # Route registration
```

#### API Endpoint

**Route**: `GET /api/export/summary-csv`

**Authentication**: Required (Admin only)

**Query Parameters**:
- `type` (required): Filter type - `day`, `week`, `month`, or `year`
- `date` (required): ISO date string (e.g., "2024-12-01T00:00:00.000Z")

**Response**: CSV file download with headers:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="bims_summary_{type}_{timestamp}.csv"
```

#### Key Functions

1. **calculateDateRange(type, dateString)**
   - Calculates start and end dates based on filter type
   - Uses dayjs for date manipulation
   - Returns: `{ startDate, endDate }`

2. **generateSummaryData(startDate, endDate)**
   - Queries all relevant MongoDB collections
   - Aggregates data based on date range
   - Returns comprehensive summary object

3. **sanitizeCsvValue(value)**
   - Prevents CSV injection attacks
   - Escapes special characters
   - Handles formula prevention (=, +, -, @)

4. **convertToCSV(summary)**
   - Converts summary object to CSV format
   - Creates header row from object keys
   - Creates data row from sanitized values

### Frontend Implementation

#### File Structure
```
front/
├── src/
│   ├── components/
│   │   └── ExportSummaryModal.jsx   # Modal component
│   └── pages/
│       └── Admin/
│           └── AdminDashboard.jsx    # Dashboard integration
```

#### Components

**ExportSummaryModal**
- Ant Design Modal component
- Filter type selector (Select)
- Date picker with dynamic picker mode
- Download button with loading state
- Error handling and user feedback

**Props**:
- `visible` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal closes

#### User Flow

1. Admin clicks "Export Summary" button on dashboard
2. Modal opens with filter type selection (default: month)
3. Admin selects filter type (day/week/month/year)
4. DatePicker updates to appropriate mode
5. Admin selects date
6. Helper text displays selected range
7. Admin clicks "Download CSV"
8. Loading state shows during generation
9. File downloads automatically
10. Success message displays
11. Modal closes

## Usage Examples

### Backend API Call (curl)

```bash
# Export monthly summary for December 2024
curl -X GET "http://localhost:4000/api/export/summary-csv?type=month&date=2024-12-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output bims_summary_month.csv

# Export daily summary
curl -X GET "http://localhost:4000/api/export/summary-csv?type=day&date=2024-12-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output bims_summary_day.csv

# Export yearly summary
curl -X GET "http://localhost:4000/api/export/summary-csv?type=year&date=2024-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output bims_summary_year.csv
```

### Frontend Usage

```jsx
import ExportSummaryModal from '../../components/ExportSummaryModal';

function AdminDashboard() {
  const [exportModalVisible, setExportModalVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setExportModalVisible(true)}>
        Export Summary
      </Button>

      <ExportSummaryModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
    </>
  );
}
```

## CSV Output Format

### Sample CSV Structure

```csv
barangay_name,municipality,report_range_start,report_range_end,total_population,new_residents_in_range,male_count,female_count,age_0_12,age_13_17,age_18_59,age_60_plus,registered_voters,employed,unemployed,students,pwd_count,senior_citizen_count,solo_parent_count,total_households,new_households_in_range,avg_household_size,households_with_unpaid_fees,garbage_fee_collected,garbage_fee_unpaid,streetlight_fee_collected,streetlight_fee_unpaid,fee_compliance_rate,income_total,expense_total,net_balance,total_doc_requests,clearance_count,indigency_count,residency_count,business_clearance_count,completed_requests,pending_requests,doc_request_revenue,most_requested_document,total_blockchain_records,verified_ledger_entries
La Torre North,Himamaylan City,2024-12-01,2024-12-31,1250,45,625,625,280,150,720,100,850,420,280,310,45,100,38,320,12,3.91,45,25000.00,8500.00,3200.00,1800.00,84.62,125000.00,85000.00,40000.00,156,45,32,28,51,98,58,31200.00,Barangay Clearance,342,342
```

### CSV Fields Explanation

| Field | Description | Data Type |
|-------|-------------|-----------|
| barangay_name | Name of the barangay | String |
| municipality | Municipality name | String |
| report_range_start | Start date of report range | Date (YYYY-MM-DD) |
| report_range_end | End date of report range | Date (YYYY-MM-DD) |
| total_population | Total number of residents | Integer |
| new_residents_in_range | New residents added in range | Integer |
| male_count | Number of male residents | Integer |
| female_count | Number of female residents | Integer |
| age_0_12 | Children aged 0-12 | Integer |
| age_13_17 | Teenagers aged 13-17 | Integer |
| age_18_59 | Adults aged 18-59 | Integer |
| age_60_plus | Senior citizens 60+ | Integer |
| registered_voters | Number of registered voters | Integer |
| employed | Number of employed residents | Integer |
| unemployed | Number of unemployed residents | Integer |
| students | Number of students | Integer |
| pwd_count | Persons with disabilities | Integer |
| senior_citizen_count | Senior citizens count | Integer |
| solo_parent_count | Solo parents count | Integer |
| total_households | Total number of households | Integer |
| new_households_in_range | New households in range | Integer |
| avg_household_size | Average household size | Decimal |
| households_with_unpaid_fees | Households with outstanding fees | Integer |
| garbage_fee_collected | Garbage fees collected (PHP) | Decimal |
| garbage_fee_unpaid | Garbage fees unpaid (PHP) | Decimal |
| streetlight_fee_collected | Streetlight fees collected (PHP) | Decimal |
| streetlight_fee_unpaid | Streetlight fees unpaid (PHP) | Decimal |
| fee_compliance_rate | Fee payment compliance rate | Percentage |
| income_total | Total income (PHP) | Decimal |
| expense_total | Total expenses (PHP) | Decimal |
| net_balance | Net balance (PHP) | Decimal |
| total_doc_requests | Total document requests | Integer |
| clearance_count | Barangay clearances issued | Integer |
| indigency_count | Indigency certificates issued | Integer |
| residency_count | Residency certificates issued | Integer |
| business_clearance_count | Business clearances issued | Integer |
| completed_requests | Completed document requests | Integer |
| pending_requests | Pending document requests | Integer |
| doc_request_revenue | Revenue from document fees (PHP) | Decimal |
| most_requested_document | Most popular document type | String |
| total_blockchain_records | Total blockchain records | Integer |
| verified_ledger_entries | Verified ledger entries | Integer |

## Security Features

### 1. CSV Injection Prevention
- Values starting with `=`, `+`, `-`, `@` are prefixed with single quote
- Prevents formula execution in spreadsheet applications

### 2. Authentication & Authorization
- Requires valid JWT token
- Admin role verification
- 403 Forbidden for non-admin users

### 3. Input Validation
- Filter type validation (only allowed values)
- Date format validation using dayjs
- Query parameter sanitization

### 4. Data Sanitization
- Double-quote escaping in CSV values
- Special character handling
- Null/undefined value handling

## Error Handling

### Backend Errors

1. **Missing Parameters (400)**
   ```json
   { "message": "Missing required parameters: type and date" }
   ```

2. **Invalid Filter Type (400)**
   ```json
   { "message": "Invalid type. Must be one of: day, week, month, year" }
   ```

3. **Invalid Date Format (400)**
   ```json
   { "message": "Invalid date format. Please provide a valid ISO date string." }
   ```

4. **Unauthorized (401)**
   ```json
   { "message": "Unauthorized" }
   ```

5. **Forbidden (403)**
   ```json
   { "message": "Forbidden: Admin access required" }
   ```

6. **Server Error (500)**
   ```json
   { 
     "message": "Failed to generate CSV export",
     "error": "Error details..."
   }
   ```

### Frontend Error Handling

- **Network errors**: Display generic error message
- **403 errors**: "Access denied. Admin privileges required."
- **400 errors**: "Invalid request parameters"
- **Success**: "CSV exported successfully: {filename}"

## Testing

### Manual Testing Steps

1. **Test Day Filter**
   - Select "Day" filter type
   - Choose a specific date
   - Verify date picker shows date format
   - Download CSV and verify data is for that specific day

2. **Test Week Filter**
   - Select "Week" filter type
   - Choose a week
   - Verify date picker shows week format
   - Download CSV and verify data is for that week

3. **Test Month Filter**
   - Select "Month" filter type
   - Choose a month
   - Download CSV and verify data is for that month

4. **Test Year Filter**
   - Select "Year" filter type
   - Choose a year
   - Download CSV and verify data is for that year

5. **Test Authorization**
   - Logout and attempt to access endpoint
   - Verify 401/403 response

6. **Test CSV Content**
   - Open downloaded CSV in spreadsheet software
   - Verify all columns are present
   - Verify data accuracy
   - Check for formula injection prevention

### Automated Testing (Backend)

```javascript
// Example Jest test
describe('Export Controller', () => {
  describe('calculateDateRange', () => {
    it('should calculate day range correctly', () => {
      const { startDate, endDate } = calculateDateRange('day', '2024-12-01');
      expect(startDate).toEqual(new Date('2024-12-01T00:00:00.000Z'));
      expect(endDate).toEqual(new Date('2024-12-01T23:59:59.999Z'));
    });
  });

  describe('sanitizeCsvValue', () => {
    it('should prevent formula injection', () => {
      expect(sanitizeCsvValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvValue('+1234')).toBe("'+1234");
    });
  });
});
```

## Performance Considerations

### Database Queries
- Use lean() for better performance
- Index commonly queried fields (createdAt)
- Consider pagination for very large datasets

### Memory Management
- CSV generation is done in-memory
- For very large datasets, consider streaming approach
- Monitor server memory usage

### Optimization Tips
1. Add database indexes on createdAt fields
2. Cache settings data
3. Use aggregation pipeline for complex queries
4. Consider Redis caching for frequently requested ranges

## Maintenance

### Adding New Fields

To add a new field to the CSV export:

1. **Update generateSummaryData() function**
   ```javascript
   // Add new calculation
   const newField = await calculateNewField(startDate, endDate);
   
   // Add to return object
   return {
     ...existingFields,
     new_field_name: newField
   };
   ```

2. **Update documentation**
   - Add field to CSV Fields table
   - Update sample CSV structure

3. **Test the new field**
   - Verify data accuracy
   - Test with different date ranges

### Troubleshooting

**Issue**: CSV file is empty or has no data
- **Solution**: Check date range is correct and data exists in that range

**Issue**: Special characters not displaying correctly
- **Solution**: Ensure CSV is opened with UTF-8 encoding

**Issue**: Formula injection warning in Excel
- **Solution**: Verify sanitizeCsvValue() is working correctly

**Issue**: Download not triggering
- **Solution**: Check browser console for errors, verify responseType: 'blob'

## Dependencies

### Backend
- `dayjs` (^1.11.19) - Date manipulation
- `express` - Web framework
- `mongoose` - MongoDB ODM

### Frontend
- `antd` - UI components
- `dayjs` - Date manipulation
- `axios` - HTTP client
- `@ant-design/icons` - Icons

## Future Enhancements

1. **Multi-format Export**
   - Add PDF export option
   - Add Excel (XLSX) format
   - Add JSON export

2. **Scheduled Reports**
   - Automatic monthly/yearly exports
   - Email delivery of reports
   - Report templates

3. **Custom Field Selection**
   - Allow admins to choose which fields to include
   - Save export templates
   - Preset configurations

4. **Advanced Filtering**
   - Multiple date ranges
   - Purok-specific exports
   - Custom date range picker

5. **Report Visualization**
   - Preview before download
   - Charts and graphs
   - PDF report generation

## Support

For issues or questions regarding the CSV export feature:
1. Check this documentation
2. Review error logs in backend console
3. Check browser console for frontend errors
4. Verify database connectivity and data integrity

## Version History

- **v1.0.0** (December 2024)
  - Initial implementation
  - Day, week, month, year filtering
  - Comprehensive data aggregation
  - CSV format export
  - Security features (CSV injection prevention, authentication)
