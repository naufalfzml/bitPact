## 1. Database Migration

- [x] 1.1 Create migration SQL to update `events` table with `access_type` and `password_hash` fields
- [x] 1.2 Create migration SQL to define `event_whitelist` table with `event_id` and `wallet_address`
- [x] 1.3 Apply SQL migrations to the local database / Supabase schemas

## 2. Backend Implementation

- [x] 2.1 Update event creation logic in backend `routes/events.js` to support hashing and saving passwords using bcrypt
- [x] 2.2 Update event creation logic in backend `routes/events.js` to save whitelist addresses for invite-only events
- [x] 2.3 Add validation guard in backend registration endpoint to prevent creators from joining their own events
- [x] 2.4 Add password validation logic using bcrypt in backend registration endpoint for `password` events
- [x] 2.5 Add whitelist lookup check in backend registration endpoint for `invite_only` events
- [x] 2.6 Implement /api/events/:id/whitelist endpoint to allow creators to add invitees (manually or via Social Connect lookups)

## 3. Frontend Implementation

- [x] 3.1 Update Event Creation form to support selecting `access_type` (Public, Password, Invite-Only)
- [x] 3.2 Add password input field in Event Creation form if Password access is selected
- [x] 3.3 Add participant input/whitelist builder in Event Creation form if Invite-Only access is selected
- [x] 3.4 Display access type badge (e.g. "■ PRIVATE: PASSWORD ■" or "■ PRIVATE: INVITE ONLY ■") on event details and event cards
- [x] 3.5 Build the retro-style password input UI and "■ ENTER ROOM CODE ■" button on event details page for password events
- [x] 3.6 Disable registration button for the event creator and display "■ KREATUR TIDAK BISA IKUT BERMAIN ■"
- [x] 3.7 Integrate whitelist management / Social Connect lookup UI in event details for creators of invite-only events

## 4. Verification and Testing

- [x] 4.1 Verify backend validation for password and whitelist events using automated or manual test requests
- [x] 4.2 Verify backend block for creator registration
- [x] 4.3 Verify full integration of private events user flows on local browser frontend
