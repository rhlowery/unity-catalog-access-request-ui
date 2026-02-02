import { Given, When, Then, defineParameterType } from '@badeball/cypress-cucumber-preprocessor';

// Authentication and session management step definitions
defineParameterType({
  name: 'sessionData',
  regexp: /[^\\n]+/,
  transformer: (value: any) => {
    const encrypted = value?.encrypted;
    const iv = value?.iv;
    if (encrypted && iv) {
      return { encrypted, iv };
    }
    return value;
  },
});

// And step helper
const And = Then;

// Step definitions for authentication
Given('I am on the login page', () => {
  cy.visit('/login');
});

When('I have valid credentials', () => {
  const username = Cypress.env('TEST_USER') || 'testuser';
  const password = Cypress.env('TEST_PASSWORD') || 'testpass';
  
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
});

When('I click "Login with Google"', () => {
  cy.get('[data-testid="google-login-button"]').click();
});

Then('I should see a loading indicator', () => {
  cy.get('[data-testid="login-loading"]').should('be.visible');
});

Then('I should be redirected to the main dashboard', () => {
  cy.url().should('include', '/dashboard');
});

// Session management scenarios
Given('I have a valid session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'test-session',
      userId: 'test-user',
      userName: 'Test User',
      expiresAt: new Date(Date.now() + (8 * 60 * 60 * 1000)),
      isActive: true
    };
  });
});

And('the session is approaching expiration', () => {
  cy.window().then((win) => {
    const now = Date.now();
    const expiresAt = win.sessionData?.expiresAt || 0;
    const isApproaching = (expiresAt - now) <= (60 * 60 * 1000);
    
    cy.wrap(() => {
      cy.log('Session approaching expiration - checking logic');
    }).then(() => {
      if (isApproaching) {
        cy.get('[data-testid="session-warning"]').should('be.visible');
      }
    });
  });
});

When('I click "Renew Session"', () => {
  cy.intercept('POST', '/api/session/renew', {
    statusCode: 200,
    body: {
      success: true,
      session: {
        expiresAt: new Date(Date.now() + (8 * 60 * 60 * 1000))
      }
    }
  }).as('renewalRequest');
  
  cy.get('[data-testid="renew-session-button"]').click();
  cy.wait('@renewalRequest');
});

Then('the session should be renewed', () => {
  cy.window().then((win) => {
    const session = win.sessionData;
    expect(session.expiresAt).to.be.greaterThan(Date.now());
  });
});

Then('I should see "Session renewed successfully" message', () => {
  cy.get('[data-testid="success-message"]').should('contain', 'renewed successfully');
});

// Rate limiting scenarios
Given('I have exceeded maximum login attempts', () => {
  cy.window().then((win) => {
    win.loginAttempts = 6;
    win.lockoutUntil = Date.now() + (15 * 60 * 1000);
  });
});

When('I attempt to log in again', () => {
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 429,
    body: { error: 'Too many login attempts. Please try again later.' }
  }).as('rateLimitRequest');
  
  cy.get('[data-testid="login-button"]').click();
  cy.wait('@rateLimitRequest');
});

Then('I should see rate limiting message', () => {
  cy.get('[data-testid="rate-limit-message"]').should('contain', 'Too many login attempts');
});

And('I should be temporarily locked out', () => {
  cy.window().then((win) => {
    const isLockedOut = win.lockoutUntil ? Date.now() < win.lockoutUntil : false;
    expect(isLockedOut).to.be.true;
  });
});

// Session timeout scenarios
Given('I have an active session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'test-session',
      userId: 'test-user',
      expiresAt: Date.now() - (5 * 60 * 1000), // Expired 5 minutes ago
      isActive: false
    };
  });
});

When('I interact with the application', () => {
  cy.get('[data-testid="dashboard-link"]').click();
});

Then('I should be redirected to the login page', () => {
  cy.url().should('include', '/login');
});

Then('I should see "Your session has expired. Please log in again." message', () => {
  cy.get('[data-testid="expired-message"]').should('contain', 'session has expired');
});

Then('the expired session should be destroyed', () => {
  cy.window().then((win) => {
    expect(win.sessionData).to.be.null;
  });
});

// Multi-session management scenarios
Given('I am logged in on multiple devices', () => {
  cy.window().then((win) => {
    win.activeSessions = [
      {
        id: 'session1',
        userId: 'test-user',
        deviceName: 'Laptop',
        createdAt: Date.now() - (30 * 60 * 1000),
      },
      {
        id: 'session2',
        userId: 'test-user', 
        deviceName: 'Mobile',
        createdAt: Date.now() - (2 * 60 * 1000),
      },
      {
        id: 'session3',
        userId: 'test-user',
        deviceName: 'Tablet',
        createdAt: Date.now() - (1 * 60 * 60 * 1000),
      }
    ];
    win.maxSessions = 3;
  });
});

And('I have reached the maximum session limit (3)', () => {
  cy.window().then((win) => {
    win.loginFromNewDevice = true;
  });
});

When('I attempt to log in from a fourth device', () => {
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 403,
    body: { error: 'Maximum sessions reached. Oldest session terminated.' }
  }).as('maxSessionsRequest');
  
  cy.get('[data-testid="login-button"]').click();
  cy.wait('@maxSessionsRequest');
});

Then('I should see "Maximum sessions reached" warning', () => {
  cy.get('[data-testid="max-sessions-warning"]').should('be.visible');
});

Then('the oldest active session should be terminated', () => {
  cy.window().then((win) => {
    if (win.activeSessions) {
      expect(win.activeSessions).to.have.length(2);
      expect(win.activeSessions[0].id).to.equal('session3');
    }
  });
});

// Session security validation scenarios
Given('I have an active session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'test-session',
      userId: 'test-user',
      expiresAt: new Date(Date.now() + (8 * 60 * 60 * 1000)),
      isActive: true
    };
  });
});

And('suspicious activity is detected on the session', () => {
  cy.window().then((win) => {
    win.suspiciousActivity = {
      type: 'UNAUTHORIZED_ACCESS',
      ip: '192.168.1.100',
      userAgent: 'Malicious Bot',
      timestamp: Date.now()
    };
  });
});

When('the security validation runs', () => {
  cy.intercept('POST', '/api/session/validate', {
    statusCode: 401,
    body: { error: 'Security violation detected' }
  }).as('securityValidationRequest');
  
  cy.get('[data-testid="dashboard-link"]').click();
  cy.wait('@securityValidationRequest');
});

Then('the session should be immediately terminated', () => {
  cy.window().then((win) => {
    expect(win.sessionData).to.be.null;
  });
});

And('a security event should be logged', () => {
  cy.window().then((win) => {
    expect(win.securityEvents).to.include({
      type: 'SECURITY_VIOLATION',
      sessionId: 'test-session',
      details: win.suspiciousActivity,
      timestamp: Cypress.moment().format()
    });
  });
});

And('administrators should be notified', () => {
  cy.get('[data-testid="admin-notification"]').should('exist');
});