# Server Architecture Conventions

- Keep the backend order state machine manual while the lifecycle is small.
- Prefer explicit transition helpers plus database consistency checks over a
  state-machine library for the current Belt order flow.
- Consider XState only if workflows grow into parallel states, timers, retries,
  long-running async steps, nested flows, or need visualization/simulation.
- Examples that may justify XState later: payment authorization, walker GPS
  tracking, disputes, refunds, timed auto-cancel, or notification retries.
