# ADR-010: Real-Time Scoring Architecture

**Date**: January 7, 2026
**Status**: Accepted (Implemented in v2.0.12)
**Decision makers**: Frontend development team

## Context and Problem

The v2.0.12 scoring system must allow players to record scores in real time with dual validation (player + marker):

**Requirements:**
- Player records their score hole by hole
- Real-time validation: ✅ matches marker, ❌ discrepancy
- Scorecard can only be submitted if all holes are ✅ (18 or fewer if match decided early)
- UI must reflect changes in <10 seconds
- Offline support with localStorage queue and automatic synchronization
- Multi-device session locking via BroadcastChannel

**Problem:**
How to synchronize data between player and marker in real time without WebSockets?

## Options Considered

1. **Polling with React Query (10s)**: Client queries every 10s
2. **WebSocket (Socket.io)**: Persistent bidirectional connection
3. **Server-Sent Events (SSE)**: Unidirectional push from server
4. **Long Polling**: Client waits for response until timeout

## Decision

**We adopted Polling with `useScoring` hook (setInterval 10s) for v2.0.12:**

### Architecture

**Frontend (actual implementation):**
```javascript
// useScoring hook - polling via setInterval every 10s
// Does not use React Query directly, manages its own state
export const useScoring = (matchId, currentUserId) => {
  const [scoringView, setScoringView] = useState(null);
  // ... central state: currentHole, isLoading, error, isSubmitting, matchSummary

  // Polling every 10s
  useEffect(() => {
    fetchScoringView();
    pollIntervalRef.current = setInterval(() => {
      if (!isOffline) fetchScoringView();
    }, POLL_INTERVAL);
    return () => clearInterval(pollIntervalRef.current);
  }, [fetchScoringView, isOffline]);

  // Offline queue: localStorage queue + sync on reconnect
  // Session lock: BroadcastChannel prevent concurrent devices
};
```

**Backend:**
```
GET /api/v1/matches/{id}/scoring-view
→ {
    match_id, match_number, match_format, match_status, is_decided,
    marker_assignments: [...],
    players: [...],
    holes: [...],
    scores: [{ hole_number, player_scores: [{ own_score, marker_score, validation_status }] }],
    match_standing: { status, leading_team, holes_played },
    scorecard_submitted_by: [...]
  }
```

**UI: 3 Tabs**
1. **Input Tab**: Record scores (free navigation 1-18)
2. **Scorecard Tab**: Full table (gross/net/result)
3. **Leaderboard Tab**: Match status (2 UP through 14)

### Validation Rules

- ✅ Green: `player_score === marker_score`
- ❌ Red: `player_score !== marker_score`
- ⚪ Gray: `player_score === null || marker_score === null`
- **Submit blocked**: If there exists a hole with ❌

## Rationale

### Why Polling vs WebSocket:

**Polling Advantages:**
- ✅ **Simplicity**: No WebSocket server required
- ✅ **Infrastructure**: Reuses existing FastAPI (no Socket.io server needed)
- ✅ **Debugging**: Easy to see requests in Network tab
- ✅ **Resilience**: Auto-recovery if request fails
- ✅ **Caching**: React Query handles cache automatically

**Accepted Drawbacks:**
- ❌ **Latency**: Up to 10s delay (acceptable for golf, not time-critical)
- ❌ **Traffic**: 6 requests/min (acceptable, small payload ~5KB)
- ❌ **Mobile battery**: Constant polling consumes more (mitigated: pause if app in background)

**When to migrate to WebSocket:**
- If latency <5s is required
- If live chat between players is added
- If leaderboard needs updates <10s

### Why React Query vs Custom Polling:

- ✅ **Optimistic updates**: Built-in
- ✅ **Request deduplication**: Multiple components use the same query without duplicating requests
- ✅ **Background refetching**: Updates when user returns to the tab
- ✅ **Error handling**: Automatic retry with exponential backoff

## Consequences

### Positive:
1. **Time-to-market**: Fast implementation without complex infrastructure
2. **Reliability**: Fewer points of failure than WebSocket
3. **Scalability**: Stateless backend, easy to scale horizontally
4. **DevEx**: React Query DevTools for debugging

### Negative (mitigated):
1. **10s latency**: May confuse users if they expect instant updates
   - *Mitigation*: Optimistic updates for immediate feedback, "Syncing..." message
2. **Extra traffic**: 6 req/min per active match
   - *Mitigation*: Compact payload, pause polling if tab inactive
3. **Complex synchronization**: Possible race conditions
   - *Mitigation*: Backend uses timestamps, last annotation wins

## Implementation (v2.0.12 — Sprint 4)

### useScoring Hook (replaces scoringStore + React Query):
```javascript
// src/hooks/useScoring.js — Central hook for live scoring
export const useScoring = (matchId, currentUserId) => {
  // State: scoringView, currentHole, isLoading, error, isSubmitting, matchSummary
  // Offline: isOffline, pendingQueueSize
  // Session: isSessionBlocked

  // Derived values:
  const isMatchPlayer = scoringView?.players?.some(p => p.userId === currentUserId);
  const hasSubmitted = scoringView?.scorecardSubmittedBy?.includes(currentUserId);
  const canSubmitScorecard = isMatchPlayer && !hasSubmitted && validatedHoles >= totalHoles;

  // Actions: submitScore, submitScorecard, concedeMatch, setCurrentHole, refetch
};
```

### Offline Queue (localStorage):
```javascript
// src/utils/scoringOfflineQueue.js
// Enqueues scores when offline, processes on reconnect
// enqueue(matchId, holeNumber, scoreData) → stores in localStorage
// Window online event → processQueue() → replay scores via API
```

### Session Lock (BroadcastChannel):
```javascript
// src/utils/scoringSessionLock.js
// Prevents concurrent scoring sessions on multiple devices
// acquire(matchId, sessionId) → BroadcastChannel negotiation
// If another tab/device holds lock → SessionBlockedModal shown
```

### Leaderboard Polling (30s, public page):
```javascript
// src/pages/public/LeaderboardPage.jsx
useEffect(() => {
  const interval = setInterval(fetchLeaderboard, 30000);
  return () => clearInterval(interval);
}, [competitionId]);
```

## Rejected Alternatives

### WebSocket (Socket.io):
- **Why not**: Requires a dedicated WebSocket server (extra infrastructure)
- **When to reconsider**: v2.2.0 if users report unacceptable latency

### Server-Sent Events (SSE):
- **Why not**: Unidirectional push, not ideal for bidirectional (player records → backend → marker)
- **When to use**: If we only need push (e.g.: notifications)

### Long Polling:
- **Why not**: Complex to implement correctly, consumes more resources than short polling
- **Minimal benefit**: Reducing latency from 10s to ~5s does not justify the complexity

## References

- React Query Polling: https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching
- Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- WebSocket vs Polling: https://ably.com/topic/long-polling-vs-websockets

## Change History

- **2026-01-07**: ADR creation, initial design with React Query polling
- **2026-02-19**: Updated with actual implementation v2.0.12 (useScoring hook, offline queue, session lock)
