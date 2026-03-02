# ADR-009: RBAC System (Role-Based Access Control)

**Date**: January 7, 2026
**Status**: Accepted (Implemented in v2.1.0)
**Decision Makers**: Frontend development team

## Context and Problem

The v2.1.0 application introduces differentiated functionalities by user type:
- **Administrators** must manage users and approve golf courses
- **Organizers** must create tournaments, plan matches, and invite players
- **Players** should only participate in tournaments (record scores)

**Requirements:**
- Granular access control by route and component
- Permission hierarchy (Admin > Creator > Player)
- Adaptive UI based on role
- Compatible with Clean Architecture

## Options Considered

1. **RBAC (Role-Based)**: 3 roles with clear hierarchy
2. **PBAC (Permission-Based)**: Granular permissions (create_competition, delete_user...)
3. **ABAC (Attribute-Based)**: Complex attribute-based rules
4. **Route-only guards**: No component-level protection

## Decision

**We adopt RBAC with 3 hierarchical roles and Zustand + React Router guards:**

### Roles and Hierarchy

```typescript
enum RoleName {
  ADMIN = "ADMIN",      // Full access (includes CREATOR + PLAYER)
  CREATOR = "CREATOR",  // Tournament management + participation (includes PLAYER)
  PLAYER = "PLAYER"     // Participation only
}
```

### Implementation

**authStore (Zustand):**
```javascript
export const useAuthStore = create((set, get) => ({
  roles: [],
  hasRole: (role) => {
    const { roles } = get();
    if (roles.some(r => r.name === 'ADMIN')) return true;
    if (role === 'PLAYER' && roles.some(r => r.name === 'CREATOR')) return true;
    return roles.some(r => r.name === role);
  }
}));
```

**RoleGuard (React Router):**
```jsx
<Route path="/admin/users" element={
  <RoleGuard allowedRoles={['ADMIN']}>
    <AdminUsersPage />
  </RoleGuard>
} />
```

**Component-level:**
```jsx
{hasRole('ADMIN') && <DeleteButton />}
```

## Rationale

### Why RBAC vs PBAC:
- ✅ **Simplicity**: 3 easy-to-understand roles vs 20+ granular permissions
- ✅ **Maintenance**: Adding features does not require new permissions
- ✅ **UX**: Roles align with real user roles
- ❌ **Less granular**: Cannot have "only create tournaments without planning" (acceptable trade-off)

### Why Zustand vs Context:
- ✅ **Performance**: No unnecessary re-renders
- ✅ **Persistence**: Persist middleware to maintain roles in localStorage
- ✅ **DevTools**: Zustand DevTools for debugging

## Consequences

### Positive:
1. **Security**: Access control on frontend + backend (dual layer)
2. **Improved UX**: UI only shows what the user can do
3. **Scalability**: Easy to add MODERATOR or REFEREE role without refactoring
4. **Testing**: Mocking roles is trivial in unit tests

### Negative (mitigated):
1. **Backend synchronization**: Roles must match with backend
   - *Mitigation*: Roles obtained from backend at `/api/v1/users/me/roles`
2. **Performance checks**: Verifying role on each render
   - *Mitigation*: Zustand optimizes re-renders, use useMemo if needed
3. **Frontend bypass**: Technical user can modify roles in localStorage
   - *Mitigation*: Backend validates roles on each request (frontend is UI only)

## Implementation

### Backend Endpoints:
```
GET    /api/v1/users/me/roles
POST   /api/v1/admin/users/{id}/roles
DELETE /api/v1/admin/users/{id}/roles/{role}
```

### Protected Routes:
- `/admin/*` → ADMIN only (RoleGuard)
- `/creator/*` → ADMIN + CREATOR (RoleGuard or useUserRoles per-competition)
- `/player/*` → All (authenticated)
- `/competitions/:id/schedule` → Authenticated + enrollment APPROVED (no RoleGuard, enrollment-based access)

> **Note:** Schedule access is enrollment-based, not role-based. Any authenticated user
> with APPROVED enrollment can view the calendar in read-only mode.
> Creators/admins access via `/creator/competitions/:id/schedule` with management permissions.
> Write authorization (create rounds, declare walkover, etc.) is controlled by `canManage`
> within SchedulePage (based on `useUserRoles`).

### Tests:
```javascript
describe('RoleGuard', () => {
  it('allows ADMIN to access /admin routes');
  it('blocks PLAYER from /admin routes');
  it('allows CREATOR to access PLAYER routes (inheritance)');
});
```

## Rejected Alternatives

### PBAC (Permission-Based):
- **Why not**: 20+ permissions difficult to manage (create_competition, edit_competition, delete_competition...)
- **When to reconsider**: If we need ultra-granular control (e.g., different types of admins)

### ABAC (Attribute-Based):
- **Why not**: Overkill, unnecessary complex rules
- **When to use**: If we need "only edit own tournaments" (currently validated on backend)

## References

- OWASP RBAC Cheat Sheet
- Zustand Persist Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- React Router v6 Protected Routes

## Change History

- **2026-01-07**: ADR creation, v2.1.0 implementation
- **2026-02-08**: Added note about enrollment-based schedule access (not RBAC)
