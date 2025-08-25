# TDH Agency Leave Tracker - Sprint Planning

## 🎯 Current Sprint: Chunk 3.1 - Leave Request CRUD

**Duration**: August 27-30, 2025  
**Approach**: Vibe Coding - Incremental development with immediate feedback  
**Goal**: Core business logic for leave request management  

---

## 📊 Sprint Overview

### ✅ Completed Foundation
- **Chunk 1.1**: Security & Environment Setup ✅
- **Chunk 1.2**: Database Seeding & Testing ✅  
- **Chunk 2.1**: API Standardization ✅

### 🚀 Current Sprint: Chunk 3.1
**Priority**: 🔴 High (Core Business Logic)  
**Status**: Ready to start  
**Target**: Leave request CRUD operations with business logic  

---

## 🎮 Vibe Coding Sessions

### Session 1: The Foundation (1-2 hours)
**Goal**: Get first endpoint working for immediate dopamine hit

#### Tasks:
- [ ] Update Prisma schema for Leave model (if needed)
- [ ] Create `/api/leave/request` POST endpoint
- [ ] Test with Thunder Client/Postman
- [ ] See requests in database immediately!

#### Success Criteria:
- ✅ Can POST a leave request
- ✅ Request appears in database
- ✅ Returns standardized API response

#### Vibe Check:
- "Leave request created successfully!" in Postman
- Real data in database
- Instant gratification achieved

---

### Session 2: The Retrieval (1 hour)
**Goal**: Query and display leave requests

#### Tasks:
- [ ] Build `/api/leave/requests` GET endpoint
- [ ] Add filtering by status and user
- [ ] Test with different query parameters

#### Success Criteria:
- ✅ Can GET all requests for a user
- ✅ Can filter by status (PENDING, APPROVED, REJECTED)
- ✅ Returns paginated results

#### Vibe Check:
- Query data in different ways
- See your requests in the system
- Feel the data flow

---

### Session 3: The Fun Part (2 hours)
**Goal**: Implement business logic that actually prevents conflicts

#### Tasks:
- [ ] Implement UK agent conflict detection
- [ ] Calculate leave days (excluding weekends)
- [ ] Add validation for business rules

#### Success Criteria:
- ✅ Prevents UK agents from overlapping leave
- ✅ Calculates correct leave days (excludes weekends)
- ✅ Validates business rules

#### Vibe Check:
- Business logic that actually works!
- Prevents real conflicts
- Feels like real product logic

---

### Session 4: Quick UI (1 hour)
**Goal**: Basic UI to complete the feature

#### Tasks:
- [ ] Basic form with shadcn/ui components
- [ ] Display requests in simple table
- [ ] Connect frontend to backend

#### Success Criteria:
- ✅ Can submit leave requests via UI
- ✅ Can view requests in table
- ✅ Full stack feature complete

#### Vibe Check:
- Full stack feature working
- Real user interaction
- Complete feature delivered

---

## 🎯 Key Business Logic

### UK Agent Conflict Detection
- **UK Agents**: Sup, Luis
- **Logic**: Prevent overlapping leave dates between UK agents
- **Implementation**: Check database for existing UK agent requests

### Leave Balance Calculation
- **Annual Entitlement**: 32 days
- **Weekend Exclusion**: Don't count weekends
- **Calculation**: Business days only

### Role-Based Permissions
- **Users**: Can only manage their own requests
- **Admins**: Can manage all requests
- **Validation**: Server-side permission checks

---

## 📁 Files to Create

### API Routes
- [ ] `src/app/api/leave/request/route.ts` - POST endpoint
- [ ] `src/app/api/leave/requests/route.ts` - GET endpoint  
- [ ] `src/app/api/leave/request/[id]/route.ts` - GET/PATCH/DELETE endpoints

### Business Logic
- [ ] `src/lib/validations/leave.ts` - Zod schemas
- [ ] `src/services/leave.service.ts` - Business logic layer

### UI Components (Session 4)
- [ ] `src/components/LeaveRequestForm.tsx` - Submit form
- [ ] `src/components/LeaveRequestTable.tsx` - Display table
- [ ] `src/app/leave/page.tsx` - Main leave page

---

## 🧪 Testing Strategy

### Tools
- **Thunder Client/Postman**: For immediate API feedback
- **Console.log**: Real-time debugging
- **Database queries**: Verify data persistence

### Test Scenarios
- **UK Conflict**: Sup and Luis request same dates
- **Valid Request**: Normal leave request submission
- **Invalid Dates**: Past dates, weekends only
- **Permission Test**: User trying to access other's requests

### Test Users
- **Sup**: UK agent, test conflicts
- **Luis**: UK agent, test conflicts  
- **Senay**: NZ agent, test normal flow
- **Ian**: Admin, test permissions

---

## 🚀 Success Metrics

### Technical Metrics
- [ ] All CRUD operations working
- [ ] Business logic preventing conflicts
- [ ] Proper error handling
- [ ] Role-based permissions enforced

### Vibe Metrics
- [ ] Immediate feedback on every change
- [ ] Real data flowing through system
- [ ] Business logic that feels "smart"
- [ ] Complete feature working end-to-end

### Quality Metrics
- [ ] No console errors
- [ ] Proper API responses
- [ ] Database integrity maintained
- [ ] Performance acceptable

---

## 🎯 Sprint Goals

### Primary Goal
**Deliver a working leave request system** that prevents UK agent conflicts and calculates leave balances correctly.

### Secondary Goals
- Establish patterns for future CRUD operations
- Build confidence in the codebase
- Create foundation for admin features

### Success Definition
- Users can submit leave requests
- UK agent conflicts are prevented
- Leave balances are calculated correctly
- Basic UI allows full interaction

---

## 🔄 Next Sprint Planning

### Chunk 3.2: Leave Balance & History
- User dashboard with leave balance
- Request history and status tracking
- Calendar view of team leave

### Chunk 2.2: Reusable Components (If needed)
- Build UI components as needed
- Establish design system
- Polish existing features

---

## 📝 Notes

### Vibe Coding Principles
- **Start simple**: Get basic functionality working first
- **Feel progress**: Every endpoint = immediate gratification
- **Build momentum**: Small wins lead to big features
- **Polish later**: Focus on functionality over perfection

### Risk Mitigation
- **Scope creep**: Stick to core CRUD operations
- **Over-engineering**: Start with simple logic, refactor later
- **UI rabbit holes**: Use basic components initially
- **Testing paralysis**: Test manually first, automate later

---

**Ready to vibe code! 🚀**
