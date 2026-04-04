
## Call Campaign Simulator
### Requirements
- Node.js 18+
- npm
### Install
- npm install
- Run (development)
  * npm run dev
- Build and run (from dist)
  * npm run build
  * npm run start
Configuration (CampaignConfig)
- customerList: string[]
- startTime: "HH:mm"
- endTime: "HH:mm"
- maxConcurrentCalls: number
- maxDailyMinutes: number
- maxRetries: number (default 2)
- retryDelayMs: number (default 3600000)
- timezone?: string (IANA, defaults to UTC)
Simulation Overview
- Uses the injected IClock for all time operations (no direct Date/Timers).
- Calls are simulated via CallHandler(phone) returning { answered, durationMs }.
- Concurrency limited by maxConcurrentCalls.
- Retries scheduled after failures, up to maxRetries, spaced by retryDelayMs.
- Daily minutes cap enforced; new calls are paused once the cap is reached.
- Working hours strictly enforced between startTime and endTime.
How to Try It
Run npm run dev and watch terminal logs:
📞 call start logs
🔄 retry scheduling logs
❌ permanent failure after exhausting retries
📊 periodic status snapshots
Example Scenarios
- Retries: set maxRetries > 0 and make some numbers fail in your CallHandler.
- Working hours: set startTime/endTime so current time is outside; the campaign waits until the next window.
- Daily cap: set maxDailyMinutes very low and durationMs high to see pausing until next day.
Design Overview
Architecture
- Campaign: Orchestrates state, scheduling, working hours, concurrency, daily cap, and retries.
- QueueManager: Manages the primary queue plus a time-ordered retry queue by dueTime.
- TimeUtils (Luxon): Timezone-aware helpers for working hours checks and next-window/daily computations.
Scheduling Logic
- start(): sets state to running and calls schedule().
- schedule():
  - Resets daily minutes when the calendar day changes (in the configured timezone).
  - If outside working hours: sets a timer until msUntilStart.
  - If daily cap reached: sets a timer until next day (midnight in timezone).
- Otherwise calls tryNextCall().
- tryNextCall():
  - Fills available slots up to maxConcurrentCalls while under maxDailyMinutes.
  - Prefers due retries (dueTime <= now), otherwise pulls from the main queue.
  - If nothing is due now:
   - If a future retry exists, schedule a wake-up at its dueTime.
   - If no work remains and no active calls, mark completed.
Concurrency
- A while-loop in tryNextCall() starts new calls until hitting limits.
- When a call ends: decrement activeCalls and re-schedule to evaluate the next work.
Retries
On failure: if attempts < maxRetries, schedule a retry after retryDelayMs; otherwise count as permanent failure.
Working Hours & Timezone
- startTime/endTime interpreted in the configured IANA timezone.
- If end < start, the window spans midnight; logic accounts for crossing days.
- Daily minutes reset at midnight in the campaign’s timezone.
Assumptions
- At exact endTime, no new calls start.
- DST transitions are handled by Luxon; the working window may shift/shrink/expand on transition days.
- Invalid timezone falls back to UTC.
Edge Cases
- Empty customerList: completes immediately.
- Large durationMs may push minutes beyond the cap after a call ends; cap is enforced before starting new calls.
- All numbers failing: each reaches permanent failure after maxRetries; campaign completes when no retries remain.