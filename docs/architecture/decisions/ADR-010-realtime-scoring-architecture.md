# ADR-010: Arquitectura de Scoring en Tiempo Real

**Fecha**: 7 de enero de 2026
**Estado**: Aceptado (Implementado en v2.1.0)
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

El sistema de scoring v2.1.0 debe permitir a jugadores anotar scores en tiempo real con validación dual (jugador + marcador):

**Requisitos:**
- Jugador anota su score hoyo por hoyo
- Validación en tiempo real: ✅ coincide con marcador, ❌ discrepancia
- Solo se puede entregar tarjeta si 18/18 hoyos ✅
- UI debe reflejar cambios en <10 segundos
- Soporte offline no requerido inicialmente

**Problema:**
¿Cómo sincronizar datos entre jugador y marcador en tiempo real sin WebSockets?

## Opciones Consideradas

1. **Polling con React Query (10s)**: Cliente consulta cada 10s
2. **WebSocket (Socket.io)**: Conexión bidireccional persistente
3. **Server-Sent Events (SSE)**: Push unidireccional del servidor
4. **Long Polling**: Cliente espera respuesta hasta timeout

## Decisión

**Adoptamos Polling con React Query (refetchInterval: 10s) para v2.1.0:**

### Arquitectura

**Frontend:**
```javascript
// Polling cada 10s
useQuery({
  queryKey: ['match-scoring', matchId, currentHole],
  queryFn: () => api.matches.getScoringView(matchId),
  staleTime: 0,
  refetchInterval: 10 * 1000
});

// Anotar score con optimistic update
useMutation({
  mutationFn: annotateScore,
  onMutate: async (newScore) => {
    // Update UI inmediatamente
    queryClient.setQueryData(['match-scoring'], old => ({...old, player_score: newScore}));
  }
});
```

**Backend:**
```
GET /api/v1/matches/{id}/scoring-view
→ {
    input_tab: { validation_status: "match" | "mismatch" | "pending" },
    scorecard_tab: { holes: [...] },
    leaderboard_tab: { team_standings: {...} }
  }
```

**UI: 3 Pestañas**
1. **Input Tab**: Anotar scores (navegación libre 1-18)
2. **Scorecard Tab**: Tabla completa (bruto/neto/resultado)
3. **Leaderboard Tab**: Estado del match (2 UP through 14)

### Reglas de Validación

- ✅ Verde: `player_score === marker_score`
- ❌ Rojo: `player_score !== marker_score`
- ⚪ Gris: `player_score === null || marker_score === null`
- **Submit bloqueado**: Si ∃ hoyo con ❌

## Justificación

### Por qué Polling vs WebSocket:

**Ventajas Polling:**
- ✅ **Simplicidad**: No requiere servidor WebSocket
- ✅ **Infraestructura**: Reutiliza FastAPI existente (no necesita Socket.io server)
- ✅ **Debugging**: Fácil ver requests en Network tab
- ✅ **Resilencia**: Auto-recovery si falla request
- ✅ **Caching**: React Query maneja cache automáticamente

**Desventajas aceptadas:**
- ❌ **Latencia**: Hasta 10s de delay (acceptable para golf, no es tiempo crítico)
- ❌ **Tráfico**: 6 requests/min (acceptable, payload pequeño ~5KB)
- ❌ **Batería móvil**: Polling constante consume más (mitigado: pausar si app en background)

**Cuándo migrar a WebSocket:**
- Si se requiere latencia <5s
- Si se añade chat en vivo entre jugadores
- Si leaderboard necesita updates <10s

### Por qué React Query vs Custom Polling:

- ✅ **Optimistic updates**: Built-in
- ✅ **Request deduplication**: Múltiples componentes usan mismo query sin duplicar requests
- ✅ **Background refetching**: Actualiza cuando usuario vuelve a la tab
- ✅ **Error handling**: Retry automático con backoff exponencial

## Consecuencias

### Positivas:
1. **Time-to-market**: Implementación rápida sin infraestructura compleja
2. **Confiabilidad**: Menos puntos de fallo que WebSocket
3. **Escalabilidad**: Backend stateless, fácil escalar horizontalmente
4. **DevEx**: React Query DevTools para debugging

### Negativas (mitigadas):
1. **Latencia 10s**: Puede confundir usuarios si esperan instantaneidad
   - *Mitigación*: Optimistic updates para feedback inmediato, mensaje "Sincronizando..."
2. **Tráfico extra**: 6 req/min por match activo
   - *Mitigación*: Payload compacto, pausar polling si tab inactiva
3. **Sincronización compleja**: Race conditions posibles
   - *Mitigación*: Backend usa timestamps, última anotación gana

## Implementación

### scoringStore (Zustand):
```javascript
export const useScoringStore = create((set, get) => ({
  currentHole: 1,
  scores: [],
  validationStatus: {},
  canSubmitScorecard: () => {
    const { validationStatus } = get();
    return Object.values(validationStatus).every(v => v === "match");
  }
}));
```

### Polling Condicional:
```javascript
// Solo hace polling si hay matches IN_PROGRESS
const hasActiveMatches = data?.matches?.some(m => m.status === 'IN_PROGRESS');

useQuery({
  refetchInterval: hasActiveMatches ? 10 * 1000 : false
});
```

### Prefetching:
```javascript
// Prefetch próximo hoyo
useEffect(() => {
  if (currentHole < 18) {
    queryClient.prefetchQuery(['match-scoring', matchId, currentHole + 1]);
  }
}, [currentHole]);
```

## Alternativas Rechazadas

### WebSocket (Socket.io):
- **Por qué no**: Requiere servidor WebSocket dedicado (infraestructura extra)
- **Cuándo reconsiderar**: v2.2.0 si usuarios reportan latencia inaceptable

### Server-Sent Events (SSE):
- **Por qué no**: Push unidireccional, no ideal para bidireccional (jugador anota → backend → marcador)
- **Cuándo usar**: Si solo necesitamos push (ej: notificaciones)

### Long Polling:
- **Por qué no**: Complejo de implementar correctamente, consume más recursos que polling corto
- **Beneficio mínimo**: Reducir latencia de 10s a ~5s no justifica complejidad

## Referencias

- React Query Polling: https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching
- Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- WebSocket vs Polling: https://ably.com/topic/long-polling-vs-websockets

## Historial de Cambios

- **2026-01-07**: Creación del ADR, implementación v2.1.0
