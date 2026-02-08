# ADR-009: Sistema RBAC (Role-Based Access Control)

**Fecha**: 7 de enero de 2026
**Estado**: Aceptado (Implementado en v2.1.0)
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

La aplicación v2.1.0 introduce funcionalidades diferenciadas por tipo de usuario:
- **Administradores** deben gestionar usuarios y aprobar campos de golf
- **Organizadores** deben crear torneos, planificar matches e invitar jugadores
- **Jugadores** solo deben participar en torneos (anotar scores)

**Requisitos:**
- Control de acceso granular por ruta y componente
- Jerarquía de permisos (Admin > Creator > Player)
- UI adaptativa según rol
- Compatible con Clean Architecture

## Opciones Consideradas

1. **RBAC (Role-Based)**: 3 roles con jerarquía clara
2. **PBAC (Permission-Based)**: Permisos granulares (create_competition, delete_user...)
3. **ABAC (Attribute-Based)**: Reglas complejas basadas en atributos
4. **Route-only guards**: Sin protección a nivel de componente

## Decisión

**Adoptamos RBAC con 3 roles jerárquicos y Zustand + React Router guards:**

### Roles y Jerarquía

```typescript
enum RoleName {
  ADMIN = "ADMIN",      // Full access (incluye CREATOR + PLAYER)
  CREATOR = "CREATOR",  // Gestión torneos + participación (incluye PLAYER)
  PLAYER = "PLAYER"     // Solo participación
}
```

### Implementación

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

## Justificación

### Por qué RBAC vs PBAC:
- ✅ **Simplicidad**: 3 roles fáciles de entender vs 20+ permisos granulares
- ✅ **Mantenimiento**: Añadir features no requiere nuevos permisos
- ✅ **UX**: Roles se alinean con roles reales de usuarios
- ❌ **Menos granular**: No se puede tener "solo crear torneos sin planificar" (acceptable trade-off)

### Por qué Zustand vs Context:
- ✅ **Performance**: No re-renders innecesarios
- ✅ **Persistencia**: Middleware persist para mantener roles en localStorage
- ✅ **DevTools**: Zustand DevTools para debugging

## Consecuencias

### Positivas:
1. **Seguridad**: Control de acceso en frontend + backend (doble capa)
2. **UX mejorada**: UI solo muestra lo que el usuario puede hacer
3. **Escalabilidad**: Fácil añadir rol MODERATOR o REFEREE sin refactor
4. **Testing**: Mockear roles es trivial en tests unitarios

### Negativas (mitigadas):
1. **Sincronización backend**: Roles deben coincidir con backend
   - *Mitigación*: Roles obtenidos del backend en `/api/v1/users/me/roles`
2. **Performance checks**: Verificar rol en cada render
   - *Mitigación*: Zustand optimiza re-renders, usar useMemo si necesario
3. **Frontend bypass**: Usuario técnico puede modificar roles en localStorage
   - *Mitigación*: Backend valida roles en cada request (frontend solo UI)

## Implementación

### Endpoints Backend:
```
GET    /api/v1/users/me/roles
POST   /api/v1/admin/users/{id}/roles
DELETE /api/v1/admin/users/{id}/roles/{role}
```

### Rutas Protegidas:
- `/admin/*` → ADMIN only (RoleGuard)
- `/creator/*` → ADMIN + CREATOR (RoleGuard o useUserRoles per-competition)
- `/player/*` → Todos (authenticated)
- `/competitions/:id/schedule` → Authenticated + enrollment APPROVED (no RoleGuard, acceso basado en enrollment)

> **Nota:** El acceso al schedule es enrollment-based, no role-based. Cualquier usuario
> autenticado con enrollment APPROVED puede ver el calendario en modo read-only.
> Los creadores/admins acceden via `/creator/competitions/:id/schedule` con permisos de gestión.
> La autorización de escritura (crear rondas, declarar walkover, etc.) se controla con `canManage`
> dentro de SchedulePage (basado en `useUserRoles`).

### Tests:
```javascript
describe('RoleGuard', () => {
  it('allows ADMIN to access /admin routes');
  it('blocks PLAYER from /admin routes');
  it('allows CREATOR to access PLAYER routes (herencia)');
});
```

## Alternativas Rechazadas

### PBAC (Permission-Based):
- **Por qué no**: 20+ permisos difíciles de gestionar (create_competition, edit_competition, delete_competition...)
- **Cuándo reconsiderar**: Si necesitamos control ultra-granular (ej: diferentes tipos de admins)

### ABAC (Attribute-Based):
- **Por qué no**: Overkill, reglas complejas innecesarias
- **Cuándo usar**: Si necesitamos "solo editar torneos propios" (actualmente validado en backend)

## Referencias

- OWASP RBAC Cheat Sheet
- Zustand Persist Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- React Router v6 Protected Routes

## Historial de Cambios

- **2026-01-07**: Creación del ADR, implementación v2.1.0
- **2026-02-08**: Añadida nota sobre acceso enrollment-based al schedule (no RBAC)
