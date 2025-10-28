# Dashboard Guards

These guards are UI components that redirect to 404 if user is not permitted.

## Usage

### **AuthGuard**
```tsx
import { AuthGuard } from '@/components/guards/AuthGuard';

export function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content is only for authenticated users</div>
    </AuthGuard>
  );
}
```

### **RoleGuard**
```tsx
import { RoleGuard } from '@/components/guards/RoleGuard';
import { SuperRole, SuperResource, SuperAction } from '@wirecrest/auth-next';

export function AdminPage() {
  return (
    <RoleGuard requireRole={SuperRole.ADMIN}>
      <div>Admin-only content</div>
    </RoleGuard>
  );
}

export function UserManagement() {
  return (
    <RoleGuard 
      requirePermission={{
        resource: SuperResource.USERS,
        action: SuperAction.MANAGE
      }}
    >
      <div>User management content</div>
    </RoleGuard>
  );
}
```

### **Permission Hook**
```tsx
import { usePermissions } from '@/hooks/usePermissions';

export function MyComponent() {
  const { 
    isSuperAdmin, 
    canManage, 
    hasPermission 
  } = usePermissions();

  return (
    <div>
      {isSuperAdmin && <AdminPanel />}
      {canManage('USERS') && <UserManagement />}
      {hasPermission('TEAMS', 'READ') && <TeamList />}
    </div>
  );
}
```

## Behavior

- **Not authenticated**: Redirects to `/404`
- **Wrong role**: Redirects to `/404`
- **No permission**: Redirects to `/404`
- **Loading**: Shows loading spinner
- **Permitted**: Renders children

## Logic-Only Functions

For conditional rendering without guards, use the logic-only functions from `@wirecrest/auth`:

```tsx
import { hasPermission, canManage, isSuperAdmin } from '@wirecrest/auth-next';

export function MyComponent() {
  const { superRole } = useSuperRole();
  
  return (
    <div>
      {isSuperAdmin(superRole) && <AdminContent />}
      {canManage(superRole, 'USERS') && <UserManagement />}
      {hasPermission(superRole, 'TEAMS', 'READ') && <TeamList />}
    </div>
  );
}
```
