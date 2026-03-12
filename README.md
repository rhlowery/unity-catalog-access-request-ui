# ACS UI

A premium, standalone React application for managing Unity Catalog access requests.

## Architecture

Below are the C4 Model and UML diagrams illustrating the design of the ACS UI system.

### System Context (C4)

```mermaid
C4Context
title System Context Diagram - Unity Catalog Access Control System (ACS)

Person(user, "Data Consumer", "An analyst or engineer requesting data access")
Person(approver, "Data Owner / Admin", "An authoritative user approving requests")

System(acs, "ACS Portal", "Self-service web interface for governing Unity Catalog access")

System_Ext(uc, "Unity Catalog", "Databricks Governance Layer")
System_Ext(idp, "Identity Provider", "SCIM / Active Directory / Mock")
System_Ext(storage, "Persistence Layer", "Git, DB, or Local JSON")

Rel(user, acs, "Requests Access", "HTTPS")
Rel(approver, acs, "Reviews & Configures Approvers", "HTTPS")
Rel(acs, uc, "Reads Catalog & Provisions Grants", "REST API")
Rel(acs, idp, "Syncs Users & Groups", "SCIM / OAuth")
Rel(acs, storage, "Persists Audit & Workflows", "JSON/SQL/Git")
```

### Container Diagram (C4)

```mermaid
C4Container
title Container Diagram - Unity Catalog Access Control System (ACS)

Person(user, "Data Consumer", "A user requesting data access")
Person(approver, "Data Owner / Admin", "An authoritative user approving requests")

System_Boundary(acs_system, "ACS Portal") {
    Container(spa, "Single Page Application", "React, Vite, Tailwind", "Provides the access management user interface")
    Container(bff, "Server / BFF", "Node.js, Express", "Proxies requests, handles auth, and local persistence")
}

System_Ext(uc, "Unity Catalog", "Databricks Governance Layer")
System_Ext(idp, "Identity Provider", "SCIM / Active Directory / Mock")
System_Ext(storage, "Persistence Layer", "Git / DB / Local System")

Rel(user, spa, "Visits", "HTTPS")
Rel(approver, spa, "Approves/Configures", "HTTPS")
Rel(spa, bff, "API Calls", "JSON/HTTPS")
Rel(spa, idp, "Authenticates", "OAuth/SAML")
Rel(bff, storage, "Reads/Writes State", "File I/O, SQL, or Git")
Rel(bff, uc, "Manages Grants", "REST API")
```

### Identity & Session Management (UML Class)

```mermaid
classDiagram
    class IdentityService {
        +getAdapter() IIdentityAdapter
        +fetchIdentities() Promise
        +getCurrentUser() Promise
        +login(provider, credentials) Promise
        +logout() Promise
    }
    class IIdentityAdapter {
        <<interface>>
        +name: string
        +type: string
        +fetchIdentities(config) Promise
        +getCurrentUser(config) Promise
        +login(provider, config, credentials) Promise
        +logout(config) Promise
    }
    class MockIdentityAdapter {
    }
    class DatabricksIdentityAdapter {
    }
    class SessionManagerService {
        -storage: SessionStorage
        -config: SessionConfig
        +createSession(user, provider, tokens) Promise
        +validateSession(sessionId) Promise
        +renewSession(sessionId) Promise
        +destroySession(sessionId) Promise
    }
    class SessionStorage {
        <<interface>>
        +createSession(session) Promise
        +validateSession(sessionId) Promise
        +updateSession(sessionId, updates) Promise
        +deleteSession(sessionId) Promise
    }
    class SecureSessionStorage {
    }

    IdentityService ..> IIdentityAdapter : delegates to
    IIdentityAdapter <|.. MockIdentityAdapter
    IIdentityAdapter <|.. DatabricksIdentityAdapter
    SessionManagerService o-- SessionStorage
    SessionStorage <|.. SecureSessionStorage
```

### Access Request Flow (UML Sequence)

```mermaid
sequenceDiagram
    participant User
    participant UA as User Agent (React)
    participant SM as SessionManager
    participant BFF as BFF Server (Node/Express)
    participant UC as Unity Catalog API

    User->>UA: Select Objects & Request Access
    UA->>UA: Validate Form (Identities, Perms, Justification)
    UA->>BFF: POST /api/storage/requests (with Session Cookie)
    BFF->>BFF: Validate Session JWT
    BFF->>BFF: Enrich Request (Approvers, Expiry)
    BFF->>UC: Provision Grants (if auto-approved)
    BFF-->>UA: 201 Created (Request ID)
    UA-->>User: Show Success Toast & Modal
```

### Session Renewal Workflow (UML Sequence)

```mermaid
sequenceDiagram
    participant UA as User Agent
    participant SM as SessionManager
    participant BFF as BFF Server
    participant IDP as Identity Provider

    Note over SM: Token Expiring<br/>(Renewal Threshold Reached)
    SM->>BFF: POST /api/auth/refresh (with Credentials)
    BFF->>IDP: Validate Refresh Token
    IDP-->>BFF: New Access Token
    BFF-->>SM: 200 OK (New Session Info)
    SM->>SM: Update Local Storage
    SM-->>UA: Dispatch 'sessionRenewed' Event
```

## Features

- **Unity Catalog Browser**: Browse and select Catalogs, Schemas, Tables, Models, Volumes, and Compute resources.
- **Access Requests**: Submit requests for Users, Groups, or Service Principals with specific permissions.
- **Multi-Stage Approval**:
    - Supports multiple asset owners spanning across single or multiple data objects.
    - **All Approvers Required**: If a request encompasses multiple objects with varying owners, ALL relevant approvers must approve before it can be fulfilled.
    - **Single-Denial Failure**: If a request is denied by any single approver, the entire request fails immediately and the requester is notified.
    - **Mandatory Governance**: A governance group must check every request.
    - **Audit & Justification**: Each approver must provide a "reason" when denying a request, and every individual approval or denial is immutably tracked in the audit record.
- **Audit Logging**: Full audit trail of all requests and decisions.
- **Enterprise Authentication**:
    - **Databricks Login**: Secure direct authentication via Personal Access Token (PAT) or Username/Password.
    - **Cloud SSO**: Simulation for Google, Microsoft, and SAML (Mock).
- **Offline First**: All data is mocked and persisted locally (`localStorage`) by default.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)

## Installation

**IMPORTANT: You must install dependencies before running the project.**

1.  Clone or download this repository.
2.  Navigate to the project directory:
    ```bash
    cd unity-catalog-access-request-ui
    ```
3.  **Install dependencies (required):**
    ```bash
    npm install
    ```

> If you see an error like "command not found: vite" or "package 'vite' not found", it means you haven't run `npm install` yet.

## Running Locally (Development)

The application has two components: the React frontend (Vite) and the Backend-For-Frontend (BFF) Express server.

### 1. Start the BFF Server
```bash
cd server
npm install
npm run dev
```
The BFF server runs on `http://localhost:3001` by default.

### 2. Start the Frontend
Back in the project root:
```bash
npm run dev
```

Open your browser to `http://localhost:5173`.

> If you need to customize the BFF URL (e.g., for deployment), copy `.env.example` to `.env` and set `VITE_BFF_URL`.

## Testing

This project includes a comprehensive test suite covering unit, integration, and end-to-end (E2E) scenarios.

### Unit Tests
Unit tests are powered by [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/). They focus on service logic, utility functions, and component rendering in isolation.

```bash
# Run all unit tests
npm test

# Run tests with UI reporter
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### End-to-End (E2E) Tests
E2E tests use [Cypress](https://www.cypress.io/) with [Cucumber](https://github.com/badeball/cypress-cucumber-preprocessor) to validate business flows from the user's perspective.

**Note:** Ensure both the BFF server and the frontend are running before executing E2E tests.

```bash
# Open Cypress Test Runner (Interactive)
npx cypress open

# Run all E2E tests (Headless)
npx cypress run
```

## Building for Production

To create a static production build (which can be hosted on any static file server):

1.  Run the build command:
    ```bash
    npm run build
    ```
2.  The output files will be in the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

## How to Demo

1.  **Login**: Use the "Sign in with Google" button to login as **Alice Johnson** (Requester).
2.  **Request**: Browse the catalog (e.g., `External Locations & Compute`) and request access to a resource like `GPU Cluster`.
3.  **Logout**: Switch users to the Approver role.
4.  **Approve**: Login as "Sign in with Microsoft" (**Carol CFO**).
    - Go to the **Approver** tab.
    - Use the **Persona Switcher** to approve as `Governance Team`.
    - Then approve as `Carol CFO` (Owner).
5.  **Audit**: Check the **Audit Log** tab to see the full history.

## Technology Stack
- **Framework**: React + Vite
- **Styling**: Vanilla CSS (CSS Variables, Glassmorphism)
- **Icons**: Lucide React
- **Testing**: Vitest, Cypress + Cucumber
- **Persistence**: [Localized & Pluggable Backend](BACKEND.md) (LocalStorage, RDBMS, Unity Catalog, GitOps)
