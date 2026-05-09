# RouteCare Dashboard - Supabase Integration Complete

## ✅ What's Been Implemented

The RouteCare dashboard is now connected to **real Supabase data** using the same patterns from the hospice-mgmt-ops project.

### **Dashboard Metrics - Now Live with Real Data:**

1. **Assigned Patients** - Counts total patients assigned to the logged-in clinician
2. **Scheduled Visits (This Week)** - Sum of frequency visits from all assignments
3. **Completed Visits (This Week)** - Number of routesheets completed this week (Monday-Sunday)
4. **Estimated Visit Payment** - Calculated from contracts and scheduled visits
5. **This Week's Earnings** - Sum of actual payments from completed routesheets

## 📊 How It Works

### **Supabase Pattern Used (from hospice-mgmt-ops)**

```typescript
// Direct Supabase queries following hospice-mgmt-ops pattern
supabase
  .from('assignments')
  .select('*')
  .eq('companyId', companyId)
  .eq('disciplineId', employeeId)
```

### **Data Sources (Supabase Tables)**

1. **`assignments` table**
   - Fields: `companyId`, `disciplineId`, `patientCd`, `frequencyVisit`
   - Used for: Assigned Patients count, Scheduled Visits calculation

2. **`routesheets` table**
   - Fields: `companyId`, `requestorId`, `dosStart`, `estimatedPayment`
   - Used for: Completed Visits count, Actual Earnings calculation
   - Filtered by: This week's date range (Monday 00:00 to Sunday 23:59)

3. **`contracts` table**
   - Fields: `companyId`, `patientCd`, `serviceType`, `serviceRate`
   - Used for: Estimated Payment calculation
   - Matches: Patient-specific rates or default "regular visit" rates

### **Week Calculation**

Following hospice-mgmt-ops pattern:
- **Week starts:** Monday at 00:00
- **Week ends:** Sunday at 23:59
- **Format:** MM/DD/YYYY (backend requirement)
- **Query format:** YYYY-MM-DD HH:MM (Supabase requirement)

## 🔧 Files Created/Modified

### **New Files:**

1. **`src/utils/dateHelpers.ts`**
   ```typescript
   getThisWeekDateRange() // Returns Monday-Sunday range
   formatDateForSupabase() // Converts to YYYY-MM-DD format
   ```

2. **`src/hooks/useDashboardMetrics.ts`**
   ```typescript
   useDashboardMetrics() // Custom hook that fetches all 5 metrics
   ```

### **Modified Files:**

3. **`src/pages/DashboardPage.tsx`**
   - Now uses `useDashboardMetrics()` hook
   - Shows loading spinner while fetching
   - Displays error messages if queries fail
   - Real-time data updates

## 🎯 Key Features

### **Loading States**
```tsx
if (metrics.loading) {
  return <LoadingSpinner />
}
```

### **Error Handling**
```tsx
if (metrics.error) {
  return <ErrorMessage error={metrics.error} />
}
```

### **Parallel Queries**
All 3 tables are queried simultaneously using `Promise.all()`:
```typescript
const [assignments, routesheets, contracts] = await Promise.all([...])
```

### **Auto Refresh**
Metrics refresh automatically when:
- User logs in
- Employee profile loads
- Company ID becomes available

## 📝 Data Flow

```
1. User logs in with magic link
   ↓
2. Profile fetched (companyId, role)
   ↓
3. Employee record fetched (id, position)
   ↓
4. useDashboardMetrics() hook triggers
   ↓
5. Parallel queries to Supabase:
   - assignments (assigned patients)
   - routesheets (completed visits)
   - contracts (payment rates)
   ↓
6. Calculations performed:
   - assignedPatients = assignments.length
   - scheduledVisits = sum(frequencyVisit)
   - completedVisits = routesheets.length
   - estimatedPayment = contracts.rate × scheduledVisits
   - actualEarnings = sum(routesheets.estimatedPayment)
   ↓
7. Dashboard displays real metrics
```

## 🔐 Security

- **Row Level Security (RLS)** - Enforced by Supabase
- **Company Filtering** - All queries filter by `companyId`
- **User Filtering** - All queries filter by `disciplineId` or `requestorId`
- **No Cross-Company Data** - Users can only see their own company's data

## 🐛 Debugging

The hook includes extensive console logging:

```
📊 Fetching dashboard metrics...
📅 Week range: { from: '05/05/2026 00:00', to: '05/11/2026 23:59' }
✅ Data fetched: { assignments: 5, routesheets: 3, contracts: 10 }
📈 Calculated metrics: { assignedPatients: 5, scheduledVisits: 8, ... }
```

Open browser console (F12) to see detailed logs.

## ⚠️ Requirements

### **Supabase Tables Must Exist:**

Make sure these tables are created in your Supabase project:

1. **assignments**
   ```sql
   - id (uuid)
   - companyId (text)
   - disciplineId (text)
   - patientCd (text)
   - frequencyVisit (text/number)
   - visitType (text)
   - dayOfTheWeek (array)
   - timeOfVisit (text)
   ```

2. **routesheets**
   ```sql
   - id (uuid)
   - companyId (text)
   - requestorId (text)
   - dosStart (timestamp)
   - patientCd (text)
   - service (text)
   - estimatedPayment (numeric/float)
   ```

3. **contracts**
   ```sql
   - id (uuid)
   - companyId (text)
   - patientCd (text, nullable)
   - serviceType (text)
   - serviceRate (numeric/float)
   ```

### **Row Level Security (RLS) Policies:**

Example policies (adjust to your needs):

```sql
-- assignments table
CREATE POLICY "Users can view company assignments"
  ON assignments FOR SELECT
  USING (companyId = auth.jwt()->>'companyId');

-- routesheets table
CREATE POLICY "Clinicians can view own routesheets"
  ON routesheets FOR SELECT
  USING (requestorId = auth.uid());

-- contracts table
CREATE POLICY "Users can view company contracts"
  ON contracts FOR SELECT
  USING (companyId = auth.jwt()->>'companyId');
```

## 🧪 Testing

1. **Login as a clinician** with assigned patients
2. **Check browser console** for detailed logs
3. **Verify each metric**:
   - Assigned Patients should match assignments count
   - Scheduled Visits should match sum of frequencies
   - Completed Visits should match routesheets this week
   - Payments should be calculated correctly

4. **Test loading states**:
   - Refresh page - should see spinner
   - Clear localStorage - should reload

5. **Test error handling**:
   - Disable internet - should show error
   - Wrong permissions - should show error

## 🚀 Next Steps

**Optional Enhancements:**

1. **Add real schedule data** to the bottom section
2. **Implement click handlers** for Quick Actions
3. **Add refresh button** to manually update metrics
4. **Cache metrics** for better performance
5. **Add date range selector** (This Week, Last Week, This Month)
6. **Export to CSV/PDF** functionality

All the infrastructure is in place - you now have a fully functional, data-driven dashboard! 🎉
