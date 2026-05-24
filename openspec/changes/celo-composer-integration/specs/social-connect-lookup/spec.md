## ADDED Requirements

### Requirement: Backend SHALL expose a Social Connect lookup API endpoint
The Express.js backend SHALL expose a `POST /api/social-connect/lookup` endpoint to resolve a social identifier (email or phone number) to a Celo 0x wallet address.

#### Scenario: Successful resolution of registered email or phone number
- **WHEN** a client sends a POST request to `/api/social-connect/lookup` with a registered social identifier in the request body
- **THEN** the API SHALL return status code 200 and a JSON payload containing the resolved `address` and status `RESOLVED`

#### Scenario: Unregistered social identifier
- **WHEN** a client sends a POST request to `/api/social-connect/lookup` with a social identifier that is not in the database
- **THEN** the API SHALL return status code 200 and a JSON payload containing status `NOT_RESOLVED` and empty address

### Requirement: Frontend SHALL support roster search by social identity
The Next.js tournament arena console SHALL allow creators to invite/add participants to the roster using their email or phone number in addition to 0x wallet addresses.

#### Scenario: Successful roster invitation via social lookup
- **WHEN** the creator enters an email or phone number and clicks "Add"
- **THEN** the frontend SHALL call the `/api/social-connect/lookup` API and, if resolved, add the resolved address to the tournament roster list
