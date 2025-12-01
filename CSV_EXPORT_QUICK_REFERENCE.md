# CSV Export Feature - Quick Reference

## Quick Start

### For Administrators

1. **Open Admin Dashboard**
2. **Click "Export Summary" button** (top-right)
3. **Select filter type**: Day, Week, Month, or Year
4. **Choose date** using the date picker
5. **Click "Download CSV"**
6. **File downloads automatically**

## API Quick Reference

### Endpoint
```
GET /api/export/summary-csv
```

### Parameters
| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| type | string | Yes | day, week, month, year |
| date | string | Yes | ISO date string |

### Example Request
```bash
curl "http://localhost:4000/api/export/summary-csv?type=month&date=2024-12-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output summary.csv
```

### Response Headers
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="bims_summary_month_20241201_143022.csv"
```

## CSV Fields Overview

### Categories
1. **General** (3 fields): barangay_name, municipality, date range
2. **Residents** (15 fields): demographics, age groups, employment
3. **Households** (4 fields): totals, averages, unpaid fees
4. **Fees** (5 fields): collections, unpaid amounts, compliance
5. **Financial** (3 fields): income, expenses, balance
6. **Documents** (9 fields): request counts, revenue, types
7. **Blockchain** (2 fields): records, verified entries

**Total: 41 fields per export**

## Frontend Component Usage

```jsx
import ExportSummaryModal from '@/components/ExportSummaryModal';

// In component
const [visible, setVisible] = useState(false);

<Button onClick={() => setVisible(true)}>Export</Button>

<ExportSummaryModal 
  visible={visible} 
  onClose={() => setVisible(false)} 
/>
```

## Filter Types Explained

| Type | Picker Mode | Date Format | Example |
|------|-------------|-------------|---------|
| Day | date | YYYY-MM-DD | 2024-12-01 |
| Week | week | YYYY-wo | 2024-48th |
| Month | month | YYYY-MM | 2024-12 |
| Year | year | YYYY | 2024 |

## Common Use Cases

### Monthly Report
```
Type: Month
Date: December 2024
Result: All data from Dec 1-31, 2024
```

### Quarterly Analysis
```
Export 3 monthly CSVs:
- October 2024
- November 2024  
- December 2024
Then combine in Excel
```

### Year-End Summary
```
Type: Year
Date: 2024
Result: All data from Jan 1 - Dec 31, 2024
```

### Daily Snapshot
```
Type: Day
Date: December 1, 2024
Result: Data created on Dec 1, 2024 only
```

## Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Access denied" | Not admin | Login as admin |
| "Invalid date format" | Wrong date string | Use valid ISO date |
| "Invalid type" | Wrong filter type | Use: day/week/month/year |
| "Failed to export" | Server error | Check server logs |

## Security Notes

- ✅ Admin access only
- ✅ CSV injection prevention
- ✅ Formula escaping (=, +, -, @)
- ✅ Input validation
- ✅ JWT authentication required

## File Naming Convention

```
bims_summary_{type}_{timestamp}.csv

Examples:
- bims_summary_month_20241201_143022.csv
- bims_summary_day_20241201_083045.csv
- bims_summary_year_20241201_091530.csv
```

## Opening CSV Files

### Excel
1. Open file directly (UTF-8 auto-detected)
2. Or: Data → From Text → UTF-8 encoding

### Google Sheets
1. File → Import
2. Upload CSV file
3. Auto-detect settings

### LibreOffice Calc
1. Open file
2. Choose UTF-8 encoding
3. Comma separator

## Performance Tips

- ✅ Export during off-peak hours for large datasets
- ✅ Use month/year for summary reports
- ✅ Use day for detailed analysis
- ✅ Cache frequently requested ranges

## Troubleshooting

### Download doesn't start
→ Check browser console for errors
→ Verify admin authentication

### File is empty
→ No data exists in selected range
→ Try different date range

### Special characters garbled
→ Open with UTF-8 encoding
→ Use Excel's "From Text" import

### Formula warnings in Excel
→ This is normal security
→ Values starting with = are escaped

## Files Modified

### Backend
- `back/controllers/exportController.js` (new)
- `back/routes/exportRoutes.js` (new)
- `back/server.js` (updated)

### Frontend
- `front/src/components/ExportSummaryModal.jsx` (new)
- `front/src/pages/Admin/AdminDashboard.jsx` (updated)

## Dependencies

```json
// Backend (already installed)
"dayjs": "^1.11.19"

// Frontend (already installed)
"antd": "^5.27.2",
"dayjs": "^1.11.19",
"axios": "^1.11.0"
```

## Testing Checklist

- [ ] Test day filter
- [ ] Test week filter
- [ ] Test month filter
- [ ] Test year filter
- [ ] Test with data in range
- [ ] Test with no data in range
- [ ] Test authorization (admin only)
- [ ] Test CSV opens correctly
- [ ] Test special characters
- [ ] Test formula prevention

## Support Commands

### Check backend logs
```bash
cd back
npm run dev
# Watch console for [Export CSV] logs
```

### Check frontend console
```
F12 → Console tab
Look for [Export CSV] messages
```

### Test API directly
```bash
# Get auth token first
TOKEN="your_jwt_token_here"

# Test export
curl "http://localhost:4000/api/export/summary-csv?type=month&date=2024-12-01T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN" \
  -v --output test.csv
```

## Quick Fixes

### Modal won't open
```jsx
// Check state
console.log('Modal visible:', exportModalVisible);

// Force open
setExportModalVisible(true);
```

### Download fails
```javascript
// Check response
console.log('Response type:', response.headers['content-type']);
console.log('Response status:', response.status);
```

### Date picker issues
```jsx
// Check dayjs installation
import dayjs from 'dayjs';
console.log(dayjs().format()); // Should output current date
```

## Additional Resources

- Full documentation: `CSV_EXPORT_DOCUMENTATION.md`
- Backend controller: `back/controllers/exportController.js`
- Frontend modal: `front/src/components/ExportSummaryModal.jsx`
- API routes: `back/routes/exportRoutes.js`
