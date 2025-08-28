# Leave Request Approval System

## Overview

The Leave Request Approval System provides a secure and efficient way for administrators to manage leave requests. Built with Next.js 15 compatibility in mind, it offers robust error handling, comprehensive validation, and a complete audit trail.

## API Endpoints

### Approve Leave Request
**Endpoint:** `POST /api/leave/request/[id]/approve`

**Authentication:** Required (Admin only)

**Request:**
```typescript
{
  // No body required
}
```

**Response:**
```typescript
{
  message: string;
  request: {
    id: string;
    status: 'APPROVED';
    processedAt: Date;
    processedBy: string;
    // ... other leave request fields
  }
}
```

**Error Responses:**
- 401: Authentication required
- 403: Insufficient permissions (non-admin)
- 404: Leave request not found
- 409: Request already processed
- 500: Internal server error

### Reject Leave Request
**Endpoint:** `POST /api/leave/request/[id]/reject`

**Authentication:** Required (Admin only)

**Request:**
```typescript
{
  reason: string;  // Required
}
```

**Response:**
```typescript
{
  message: string;
  request: {
    id: string;
    status: 'REJECTED';
    processedAt: Date;
    processedBy: string;
    rejectionReason: string;
    // ... other leave request fields
  }
}
```

**Error Responses:**
- 400: Missing rejection reason
- 401: Authentication required
- 403: Insufficient permissions (non-admin)
- 404: Leave request not found
- 409: Request already processed
- 500: Internal server error

## Implementation Details

### Next.js 15 Compatibility
- Uses `NextRequest` type for request handling
- Implements async params handling
- Follows Next.js 15 route handler patterns
- Maintains proper error response types

### Security
- Authentication check using NextAuth
- Role-based access control (admin only)
- Input validation and sanitization
- Proper error handling and logging

### Database Integration
- Uses Prisma for database operations
- Maintains data consistency
- Implements proper transaction handling
- Includes audit trail fields

### Testing
- Comprehensive unit tests
- Integration tests for full workflow
- Error case coverage
- Mock data generation

## Usage Example

```typescript
// Approve a leave request
const response = await fetch(`/api/leave/request/${requestId}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

// Reject a leave request
const response = await fetch(`/api/leave/request/${requestId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Overlapping with team event'
  })
});
```

## Testing

### Unit Tests
Run the unit tests using:
```bash
npm run test:unit
```

### Integration Tests
Run the integration tests using:
```bash
npm run test:approval-system
```

## Future Enhancements

1. **Email Notifications**
   - Send notifications on approval/rejection
   - Include rejection reason in emails
   - Optional: Teams/Slack integration

2. **Batch Operations**
   - Approve/reject multiple requests
   - Bulk status updates
   - Mass notifications

3. **Advanced Features**
   - Delegation of approval authority
   - Temporary admin assignments
   - Approval workflows with multiple steps
