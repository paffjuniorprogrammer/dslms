# Jitsi integration findings

Research date: 2026-08-25.

- Official Jitsi IFrame API docs: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
  - Supports embedding via `https://meet.jit.si/external_api.js` or a self-hosted domain's `/external_api.js`.
  - API constructor: `new JitsiMeetExternalAPI(domain, options)` with `roomName`, `parentNode`, `userInfo`, `configOverwrite`, `interfaceConfigOverwrite`, and optional `jwt`.
  - Supports mobile browsers.
- Official Jitsi Meet page: https://jitsi.org/jitsi-meet/
  - Describes Jitsi Meet as open source and free to use on meet.jit.si, with no account required; includes screen sharing, custom URLs, and integrated chat.
- Official JaaS page: https://jaas.8x8.vc/
  - Current displayed plan: JaaS Dev = 25 monthly active users, free; Basic = 300 MAU, $99/month; Standard = 1,500 MAU, $499/month.
  - JaaS is a managed developer service, distinct from using public meet.jit.si.
- Official self-host Docker guide: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker
  - Self-hosting requires Docker/Compose, HTTPS/public URL, firewall ports 80/tcp, 443/tcp, and 10000/udp, plus server operations.
  - Self-hosted deployment is not free infrastructure; the software is free but compute, bandwidth, TLS/domain, and maintenance are required.

Recommendation for DSLMS first migration: embed Jitsi's IFrame API using meet.jit.si (or JaaS if authenticated app-level control is required), while keeping Supabase for class records, access-code validation, exercises, answer progress, and result sharing. Use a deterministic room name derived from the live class UUID and configure teacher/student roles, teacher prejoin, student camera/mic muted, and a teacher-only moderator control if the chosen Jitsi service supports it. Public meet.jit.si is suitable for a controlled prototype but has less administrative/privacy control; self-host or JaaS is better for production schools.
