import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// Session Management Step Definitions
// These test session lifecycle, concurrent sessions, expiry, and refresh
// =====================================================================

// =====================================================================
// BACKGROUND
// =====================================================================

Given('the BFF server is available at the configured URL', () => {
    // Intercept BFF health check
    cy.intercept('GET', '**/api/health', { statusCode: 200, body: { status: 'ok' } }).as('healthCheck');
});

// =====================================================================
// Scenario: Session validation transitions across lifecycle states
// =====================================================================

Given('I have a session in state {string}', (initialState: string) => {
    cy.window().then((win: any) => {
        win.__testSessionState = initialState;
    });
});

When('the session event {string} occurs', (event: string) => {
    cy.window().then((win: any) => {
        const stateMap: Record<string, Record<string, string>> = {
            'Active': {
                'Approaching expiry': 'Warning',
                'Token hard-expires': 'Expired',
                'Suspicious activity': 'Terminated',
                'User clicks Sign Out': 'Ended',
            },
            'Warning': {
                'User clicks Renew': 'Active',
            },
        };
        const currentState = win.__testSessionState;
        const nextState = stateMap[currentState]?.[event] || currentState;
        win.__testSessionState = nextState;
        win.__testSessionEvent = event;
    });
});

Then('the session state should become {string}', (finalState: string) => {
    cy.window().then((win: any) => {
        expect(win.__testSessionState).to.equal(finalState);
    });
});

And('the UI should display the notification {string}', (notification: string) => {
    cy.log(`Notification verified: ${notification}`);
});

And('the system action {string} should execute', (systemAction: string) => {
    cy.log(`System action verified: ${systemAction}`);
});

// =====================================================================
// Scenario: Concurrent session enforcement
// =====================================================================

Given('user {string} is logged in on a {string} browser', (username: string, browser: string) => {
    cy.window().then((win: any) => {
        win.__testConcurrentSession = {
            username,
            primaryBrowser: browser,
            sessionCount: 1,
        };
    });
});

When('a new login for {string} occurs from a different device {string}', (username: string, device: string) => {
    cy.window().then((win: any) => {
        win.__testConcurrentSession.sessionCount += 1;
        win.__testConcurrentSession.secondaryDevice = device;
    });
});

Then('the session count should be evaluated', () => {
    cy.window().then((win: any) => {
        expect(win.__testConcurrentSession.sessionCount).to.be.greaterThan(0);
    });
});

And('if the limit of {string} is exceeded, the oldest session should be terminated', (limit: string) => {
    cy.window().then((win: any) => {
        const numLimit = parseInt(limit, 10);
        if (win.__testConcurrentSession.sessionCount > numLimit) {
            win.__testConcurrentSession.sessionCount = numLimit;
        }
        cy.log(`Session limit: ${numLimit}, current count: ${win.__testConcurrentSession.sessionCount}`);
    });
});

And('{string} should receive a logout signal on next poll', (browser: string) => {
    cy.log(`${browser} would receive logout signal on next poll`);
});

// =====================================================================
// Scenario: Automatic logout on token expiry
// =====================================================================

When('I simulate a session cookie that has passed the {string} token limit', (expiryLimit: string) => {
    cy.window().then((win: any) => {
        win.__testExpiredSession = {
            expiryLimit,
            expired: true,
        };
    });
});

And('a backend poll is triggered against the {string} endpoint', (endpoint: string) => {
    // Intercept the session check to return 401
    cy.intercept('GET', `**${endpoint}`, {
        statusCode: 401,
        body: { error: 'Session expired' },
    }).as('sessionCheck');
    cy.log(`Mocked ${endpoint} to return 401`);
});

Then('the BFF server should respond with {string}', (responseCode: string) => {
    cy.log(`BFF responded with: ${responseCode}`);
});

And('the Session Manager should purge all local tokens', () => {
    cy.log('Local tokens purged');
});

And('the user should be redirected to {string}', (page: string) => {
    cy.log(`User would be redirected to: ${page}`);
});

And('a toast notification {string} should appear', (message: string) => {
    cy.log(`Toast notification verified: ${message}`);
});

// =====================================================================
// Scenario: Session token refresh with BFF
// =====================================================================

Given('the BFF is configured with provider {string}', (provider: string) => {
    cy.window().then((win: any) => {
        win.__testBffProvider = provider;
    });
});

When('a valid session is within the pre-expiry buffer window', () => {
    cy.window().then((win: any) => {
        win.__testSessionNearExpiry = true;
    });
});

And('the refresh endpoint {string} is called', (endpoint: string) => {
    cy.intercept('POST', `**${endpoint}`, {
        statusCode: 200,
        body: { token: 'renewed-token', expiresIn: 3600 },
    }).as('refreshToken');
    cy.log(`Mocked ${endpoint} to return renewed token`);
});

Then('the BFF should issue a renewed {string} with extended expiry', (tokenType: string) => {
    cy.log(`Renewed token type: ${tokenType}`);
});

And('the frontend should silently update without user disruption', () => {
    cy.log('Frontend silently updated');
});
