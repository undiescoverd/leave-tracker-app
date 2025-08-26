s# API Standards Documentation

## Overview
This document defines the standardized patterns and conventions for all API endpoints in the TDH Agency Leave Tracker application.

## Response Format

### Success Response Structure
All successful API responses follow this structure:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-08-26T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "uuid-v4-string",
    "pagination": {  // Optional, for paginated responses
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Error Response Structure
All error responses follow this structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional: Additional error details
    },
    "timestamp": "2025-08-26T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-08-26T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

## HTTP Status Codes

| Status Code | Usage |
|------------|-------|
| 200 | OK - Successful GET, PUT, PATCH |
| 201 | Created - Successful POST |
| 204 | No Content - Successful DELETE |
| 400 | Bad Request - Invalid request format |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Unexpected error |

## Error Codes

Standard error codes used throughout the application:

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Authentication required |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict (e.g., duplicate) |
| `BAD_REQUEST` | Malformed request |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error |
| `INTERNAL_ERROR` | Unexpected server error |

## Request Validation

### Query Parameters
Use Zod schemas for validation:
```typescript
const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

### Request Body
Validate with Zod and return 422 for validation errors:
```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
```

## API Endpoint Patterns

### Resource Naming
- Use plural nouns for collections: `/api/users`, `/api/leaves`
- Use singular for specific resources: `/api/users/{id}`, `/api/leaves/{id}`
- Use kebab-case for multi-word resources: `/api/leave-requests`

### Standard CRUD Operations
```
GET    /api/resources       # List all resources (paginated)
GET    /api/resources/{id}  # Get specific resource
POST   /api/resources       # Create new resource
PUT    /api/resources/{id}  # Full update
PATCH  /api/resources/{id}  # Partial update
DELETE /api/resources/{id}  # Delete resource
```

### Filtering and Sorting
```
GET /api/leaves?status=pending&userId=123
GET /api/leaves?sortBy=startDate&sortOrder=desc
GET /api/leaves?startDate=2025-01-01&endDate=2025-12-31
```

### Pagination
```
GET /api/leaves?page=2&pageSize=20
```

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

## Implementation Examples

### Basic API Route
```typescript
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, StandardErrors } from '@/lib/api/response';
import { createApiRoute } from '@/middleware/error-handler';

export const GET = createApiRoute(async (request: NextRequest) => {
  // Your logic here
  const data = await fetchData();
  
  if (!data) {
    return StandardErrors.NOT_FOUND('Resource');
  }
  
  return apiSuccess(data);
});
```

### With Validation
```typescript
import { createValidatedHandler } from '@/lib/api/validation';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export const POST = createValidatedHandler(
  { body: bodySchema },
  async (request, { body }) => {
    // body is typed and validated
    const user = await createUser(body);
    return apiSuccess(user, undefined, 201);
  }
);
```

### With Rate Limiting
```typescript
import { withRateLimit } from '@/middleware/error-handler';

const handler = async (request: NextRequest) => {
  // Your logic
  return apiSuccess(data);
};

export const GET = withRateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,               // 30 requests per minute
})(handler);
```

### Method-Specific Handlers
```typescript
import { createMethodHandler } from '@/middleware/error-handler';

const handlers = createMethodHandler({
  GET: async (request) => {
    const data = await fetchData();
    return apiSuccess(data);
  },
  
  POST: async (request) => {
    const body = await request.json();
    const created = await createResource(body);
    return apiSuccess(created, undefined, 201);
  },
  
  // DELETE not implemented - returns 405
});

export const { GET, POST, DELETE } = handlers;
```

## Testing API Endpoints

### Using the Test Endpoint
The `/api/test` endpoint demonstrates all API standards:

```bash
# Test basic connection
curl http://localhost:3000/api/test

# Test with query parameters
curl "http://localhost:3000/api/test?includeUsers=true&detailed=true"

# Test POST with validation
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "echo": true}'

# Test error handling
curl -X DELETE http://localhost:3000/api/test
```

### Expected Responses

**Success Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "userCount": 4,
    "environment": "development",
    "timestamp": "2025-08-26T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-08-26T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "message": ["String must contain at least 1 character(s)"]
    },
    "timestamp": "2025-08-26T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-08-26T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

## Migration Guide

### Updating Existing Endpoints
1. Import response utilities: `import { apiSuccess, apiError } from '@/lib/api/response'`
2. Wrap handlers with error handling: `createApiRoute(handler)`
3. Replace direct `NextResponse.json()` with `apiSuccess()` or `apiError()`
4. Add validation schemas using Zod
5. Test thoroughly with different scenarios

### Before (Old Pattern)
```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

### After (New Pattern)
```typescript
import { createApiRoute } from '@/middleware/error-handler';
import { apiSuccess } from '@/lib/api/response';

export const GET = createApiRoute(async (request: NextRequest) => {
  const data = await fetchData();
  return apiSuccess(data);
});
```

## Best Practices

1. **Always validate input** - Use Zod schemas for all user input
2. **Use appropriate status codes** - Follow REST conventions
3. **Provide meaningful error messages** - Help developers debug issues
4. **Include request IDs** - For tracking and debugging
5. **Version your API** - Plan for future changes
6. **Document thoroughly** - Keep this documentation updated
7. **Test error cases** - Not just happy paths
8. **Rate limit sensitive endpoints** - Prevent abuse
9. **Log errors appropriately** - Use structured logging
10. **Keep responses consistent** - Always use the standard format

## Monitoring and Debugging

### Request IDs
Every response includes a unique request ID for tracking:
```json
{
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Logging
Errors are logged with context:
- Request URL and method
- Error stack trace
- User context (if authenticated)
- Timestamp

### Development vs Production
- **Development**: Full error details in responses
- **Production**: Generic messages for internal errors, detailed messages for operational errors

## Future Enhancements

- [ ] OpenAPI/Swagger documentation generation
- [ ] Request/Response logging middleware
- [ ] API versioning strategy
- [ ] GraphQL integration (if needed)
- [ ] WebSocket support for real-time updates
- [ ] Advanced rate limiting with Redis
- [ ] API key authentication for external access
- [ ] Webhook system for notifications
