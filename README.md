# ACS UI

A premium, standalone React application for managing Unity Catalog access requests.

## Features

- **Unity Catalog Browser**: Browse and select Catalogs, Schemas, Tables, Models, Volumes, and Compute resources.
- **Access Requests**: Submit requests for Users, Groups, or Service Principals with specific permissions.
- **Multi-Stage Approval**:
    - Supports multiple asset owners.
    - **Mandatory Governance**: A governance group must check every request.
    - **Unanimous Consent**: All owners + governance must approve.
- **Audit Logging**: Full audit trail of all requests and decisions.
- **Simulated SSO**: Login simulation for Google, Microsoft, and SAML (Mock).
- **Offline First**: All data is mocked and persisted locally (`localStorage`). No external dependencies required at runtime.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)

## Installation

1.  Clone or download this repository.
2.  Navigate to the project directory:
    ```bash
    cd unity-catalog-access-request-ui
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

## Running Locally (Development)

To start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`.

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
- **Persistence**: LocalStorage
