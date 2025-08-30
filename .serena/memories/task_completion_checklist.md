# Task Completion Checklist

## Before Marking Task Complete

### Code Quality
- [ ] Run `npm run lint` - Fix all ESLint issues
- [ ] Run `npm run fix:types` - Fix all TypeScript errors
- [ ] Test API endpoints if modified
- [ ] Verify database operations work correctly

### Testing Requirements
- [ ] Run relevant test scripts for modified areas
- [ ] Test authentication if auth-related changes
- [ ] Manual testing in browser for UI changes
- [ ] Check both desktop and mobile responsiveness

### Database & Migrations
- [ ] Run `npx prisma generate` if schema changed
- [ ] Test database operations with seed data
- [ ] Verify no database connection issues

### Error Handling
- [ ] Test error scenarios and edge cases
- [ ] Verify proper error messages are displayed
- [ ] Check API error responses are standardized

### Security Checks
- [ ] Verify authentication is working
- [ ] Check authorization for protected routes
- [ ] Test role-based access control

## Final Verification Commands
```bash
# Essential checks before task completion
npm run fix:types        # TypeScript validation
npm run lint            # Code style validation
npm run test:auth       # Authentication test
npm run dev             # Manual verification

# Database verification
npx prisma generate     # Update client if schema changed
npm run db:seed         # Test with fresh data
```

## Production Readiness
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] Performance acceptable
- [ ] Security requirements met