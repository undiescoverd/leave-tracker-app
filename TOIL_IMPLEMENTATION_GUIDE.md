# 🎯 TOIL Implementation Guide

## ✅ Implementation Status

**Phase 1: Foundation** ✅ COMPLETE
- Database schema extended with TOIL support
- Migration script applied successfully
- Feature flags configured

**Phase 2: Service Layer** ✅ COMPLETE
- Enhanced leave balance service
- TOIL management service
- Backward compatibility maintained

**Phase 3: API Endpoints** ✅ COMPLETE
- Enhanced leave request API
- TOIL management API
- Pending TOIL entries API

## 🚀 How to Enable TOIL Features

### 1. Environment Variables

Add these to your `.env.local` file to enable TOIL features:

```bash
# TOIL Feature Flags
NEXT_PUBLIC_TOIL_ENABLED=true
NEXT_PUBLIC_TOIL_REQUEST=true
NEXT_PUBLIC_TOIL_ADMIN=true
NEXT_PUBLIC_SICK_LEAVE=true
```

### 2. Feature Control

The system uses feature flags for safe rollout:

- **Master Switch**: `NEXT_PUBLIC_TOIL_ENABLED`
- **User Requests**: `NEXT_PUBLIC_TOIL_REQUEST`
- **Admin Management**: `NEXT_PUBLIC_TOIL_ADMIN`
- **Sick Leave**: `NEXT_PUBLIC_SICK_LEAVE`

## 📊 Database Schema Changes

### New Fields Added

**User Model:**
- `annualLeaveBalance` (Float, default: 32)
- `toilBalance` (Float, default: 0)
- `sickLeaveBalance` (Float, default: 3)

**LeaveRequest Model:**
- `type` (LeaveType enum, default: ANNUAL)
- `hours` (Float, optional)

**New Models:**
- `ToilEntry` - Tracks TOIL accrual and usage
- `LeaveType` enum - ANNUAL, TOIL, SICK
- `ToilType` enum - Contract-based TOIL types

## 🔧 API Endpoints

### Enhanced Leave Request API
```
POST /api/leave/request
{
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-17T00:00:00Z",
  "reason": "Vacation",
  "type": "TOIL",  // NEW: ANNUAL, TOIL, SICK
  "hours": 24      // NEW: For TOIL requests
}
```

### Enhanced Balance API
```
GET /api/leave/balance
Response:
{
  "totalAllowance": 32,
  "daysUsed": 5,
  "remaining": 27,
  "balances": {
    "annual": { "total": 32, "used": 5, "remaining": 27 },
    "toil": { "total": 8, "used": 2, "remaining": 6 },
    "sick": { "total": 3, "used": 0, "remaining": 3 }
  }
}
```

### TOIL Management API
```
POST /api/admin/toil
{
  "userId": "user_id",
  "hours": 4,
  "reason": "Weekend travel",
  "type": "WEEKEND_TRAVEL"
}

GET /api/admin/toil
PATCH /api/admin/toil (approve/reject)
GET /api/admin/toil/pending
```

## 📋 Contract-Based TOIL Rules

### TOIL Types & Calculations

1. **TRAVEL_LATE_RETURN** (Section 6.6(d))
   - 7pm return = 1 hour TOIL
   - 8pm return = 2 hours TOIL
   - 9pm return = 3 hours TOIL
   - 10pm+ return = Next day 1pm start

2. **WEEKEND_TRAVEL** (Section 6.6(c))
   - Fixed 4 hours TOIL

3. **AGENT_PANEL_DAY** (Section 6.6(b))
   - Next day 1pm start

4. **OVERTIME**
   - 1:1 ratio for general overtime

## 🛡️ Safety Features

### Backward Compatibility
- Existing leave requests default to ANNUAL type
- All existing APIs continue working
- No data migration required

### Feature Flags
- Instant rollback capability
- Granular feature control
- Safe for production deployment

### Data Integrity
- Transactional updates
- Audit trails for all changes
- Validation at multiple levels

## 🧪 Testing

### Test Script
```bash
node test-toil-implementation.js
```

### Manual Testing
1. Enable features via environment variables
2. Test leave request with different types
3. Test admin TOIL management
4. Verify balance calculations

## 📈 Usage Examples

### Creating a TOIL Leave Request
```javascript
const response = await fetch('/api/leave/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: '2024-01-15T00:00:00Z',
    endDate: '2024-01-15T00:00:00Z',
    reason: 'Using accrued TOIL',
    type: 'TOIL',
    hours: 8
  })
});
```

### Admin Adding TOIL Hours
```javascript
const response = await fetch('/api/admin/toil', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_id',
    hours: 4,
    reason: 'Weekend travel compensation',
    type: 'WEEKEND_TRAVEL'
  })
});
```

## 🔄 Rollback Plan

If issues arise:

1. **Disable Features**: Set all TOIL flags to `false`
2. **Hide UI**: Features automatically hidden when disabled
3. **Data Safe**: All existing data remains intact
4. **API Fallback**: Existing APIs continue working

## 🎯 Next Steps

1. **UI Components** - Build enhanced forms and displays
2. **Admin Dashboard** - TOIL management interface
3. **Reports** - TOIL usage and balance reports
4. **Notifications** - TOIL approval/rejection alerts

---

**Implementation Status**: ✅ Foundation Complete
**Ready for**: UI Development & Testing
**Risk Level**: 🟢 Low (Backward Compatible)
