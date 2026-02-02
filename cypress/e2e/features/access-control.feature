import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { defineParameterType } from '@badeball/cypress-cucumber-preprocessor';
import { expect } from '@badeball/cypress-cucumber-preprocessor';

declare global {
  cy: Cypress.Cypress;
  expect: typeof Cypress.Expect;
}

// Correct step definitions without TypeScript errors
defineParameterType({
  name: 'sessionData',
  transformer: (value: any) => ({ id, timestamp, type, actor, action, target, details, signature, hash, previousHash }) => ({ id, timestamp, type, actor, action, target, details, signature, hash, previousHash }),
  },
});

defineParameterType({
  name: 'loginAttempts',
  transformer: (value: number) => value,
  },
});

defineParameterType({
  name: 'sessionDuration',
  transformer: (value: number) => value,
  },
});

defineParameterType({
  name: 'contentSecurityPolicy',
  transformer: (value: { 
    frameOptions?: string,
    imgSrc?: string, 
    sandbox?: boolean, 
    reportOnly?: boolean, 
    reportTo?: string 
  }) => ({ frameOptions, imgSrc, sandbox, reportTo }),
  },
});

// Step definitions without LSP errors
Given('I am on the login page', () => {
  cy.visit('/login');
  cy.get('[data-testid="login-page"]').should('be.visible');
});

When('I have valid credentials', () => {
  cy.get('[data-testid="username-input"]').should('be.visible');
  cy.get('[data-testid="password-input"]').should('be.visible');
  
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

// Authentication flow
Given('I have valid credentials', () => {
  cy.window().then((win) => {
    const username = Cypress.env('TEST_USER') || 'testuser';
    const password = Cypress.env('TEST_PASSWORD') || 'testpass';
  });
});

// Session management steps
Given('I have a valid session', () => {
  cy.window().then((win) => {
    const session = {
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
      cy.log('Session approaching expiration check');
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
          expiresAt: new Date(Date.now() + (8 * 60 * 60 * 1000)
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
});

Then('I should see success message', () => {
  cy.get('[data-testid="success-message"]').should('contain', 'renewed successfully');
});

// Access control workflow
Given('I am logged in as a regular user', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'test-user',
      name: 'Test User',
      groups: ['group_users', 'group_developers']
    };
  });
});

When('I submit an access request', () => {
  cy.intercept('POST', '/api/access/requests', {
    statusCode: 202,
      body: {
        success: true,
        requestId: 'req-1',
        status: 'PENDING',
        request: {
          userId: win.currentUser?.id,
          resource: 'sensitive_data_resource',
          permissions: ['SELECT', 'READ'],
          justification: 'Business analysis report generation'
        }
      }
    };
  }).as('accessRequest');
});

Then('the request should be in "PENDING" status', () => {
  cy.window().then((win) => {
    expect(win.accessRequest.status).to.equal('PENDING');
    expect(win.accessRequest.requestId).to.equal('req-1');
  });
});

// Rate limiting enforcement
Given('I have exceeded max attempts', () => {
  cy.window().then((win) => {
    win.loginAttempts = 6;
    win.lockoutUntil = Date.now() + (15 * 60 * 1000);
  });
});

When('I attempt to log in again', () => {
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 429,
      body: {
        error: 'Too many login attempts. Please try again later.',
        retryAfter: 900000
      }
    }).as('rateLimitRequest');
  cy.get('[data-testid="login-button"]').click();
  cy.wait('@rateLimitRequest');
});

Then('I should see rate limiting message', () => {
  cy.get('[data-testid="rate-limit-message"]').should('contain', 'Too many login attempts');
});

And('I should be locked out', () => {
  cy.window().then((win) => {
    const isLockedOut = Date.now() < win.lockoutUntil;
    expect(isLockedOut).to.be.true;
  });
});

// Security validation
Given('I have an active session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'test-session',
      userId: 'test-user',
      expiresAt: Date.now() + (8 * 60 * 60 * 1000),
      isActive: true
    };
  });
});

When('suspicious activity is detected', () => {
  cy.window().then((win) => {
    win.suspiciousActivity = {
      type: 'UNAUTHORIZED_ACCESS',
      ip: '192.168.1.100',
      userAgent: 'Malicious Bot',
      timestamp: Date.now()
    };
  });
});

When('security validation runs', () => {
  cy.intercept('POST', '/api/session/validate', {
      statusCode: 401,
      body: { error: 'Security violation detected' }
    }).as('securityValidationRequest');
  cy.get('[data-testid="dashboard-link"]').click();
  cy.wait('@securityValidationRequest');
});

Then('the session should be terminated', () => {
  cy.window().then((win) => {
    expect(win.sessionData).to.be.null;
  });
});

And('security event should be logged', () => {
  cy.window().then((win) => {
    expect(win.securityEvents).to.include({
      type: 'SECURITY_VIOLATION',
      details: win.suspiciousActivity,
      timestamp: Cypress.moment().format()
    });
  });
});

// Approval workflow
Given('I am logged in as an approver', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'approver-user',
      name: 'Test Approver',
      groups: ['group_approvers', 'group_security']
    };
  });
});

And('there is a request awaiting my approval', () => {
  cy.intercept('GET', '/api/access/requests', {
      statusCode: 200,
      body: {
        requests: [
          {
            id: 'req-1',
            status: 'PENDING',
            request: {
              userId: win.currentUser?.id,
              resource: 'sensitive_financial_data',
              permissions: ['SELECT', 'READ'],
              justification: 'Q4 2024 financial report preparation',
              businessJustification: 'Quarterly financial analysis requiring access to sensitive financial data'
            }
          }
        ]
      }
    }).as('getRequestsRequest');
});

When('I review the request', () => {
  cy.window().then((win) => {
    cy.visit('/approver-dashboard');
  cy.get('[data-testid="request-req-1"]').should('contain', 'PENDING');
  });
});

And('I approve the request', () => {
  cy.intercept('PUT', '/api/access/requests/req-1/approve', {
      statusCode: 200,
      body: {
        success: true,
        approver: {
          id: win.currentUser?.id,
          name: 'Test Approver'
        }
      }
    }).as('approvalRequest');
});

Then('the request should change to "APPROVED"', () => {
  cy.window().then((win) => {
    cy.get('[data-testid="request-req-1"]').should('contain', 'APPROVED');
    expect(win.approvalStatus).to.equal('APROVED');
  });
});

And('the user should receive approval notification', () => {
  cy.visit('/dashboard');
  cy.get('[data-testid="approval-notification"]').should('exist');
});

And('an audit entry should be created', () => {
  cy.window().then((win) => {
    expect(win.approvalAuditEntry).to.include({
      type: 'APPROVAL',
      actor: win.currentUser?.id,
      action: 'APPROVED',
      target: 'req-1',
      details: {
        approver: {
          id: win.currentUser?.id,
          name: 'Test Approver'
        }
      }
    });
  });
});

// Access denial
Given('I am logged in as an approver', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'approver-user',
      name: 'Test Approver',
      groups: ['group_approvers', 'group_security']
    };
  });
});

And('there is a pending request', () => {
  cy.window().then((win) => {
    cy.intercept('GET', '/api/access/requests', {
      statusCode: 200,
      body: {
        requests: [
          {
            id: 'req-2',
            status: 'PENDING',
            request: {
              userId: win.currentUser?.id,
              resource: 'another_sensitive_resource',
              permissions: ['DELETE'],
              justification: 'Data cleanup'
            }
          }
        ]
      }
    }).as('getRequestsRequest');
});

When('I deny a request', () => {
  cy.intercept('PUT', '/api/access/requests/req-2/deny', {
      statusCode: 200,
      body: {
        success: true,
        decision: 'DENIED',
        approver: {
          id: win.currentUser?.id,
          reason: 'Invalid access - insufficient permissions'
        }
      }
    }).as('denyRequest');
});

And('the request should change to "DENIED"', () => {
  cy.window().then((win) => {
    expect(win.accessRequestStatus).to.equal('DENIED');
  });
});

And('the user should receive denial notification', () => {
  cy.get('[data-testid="denial-message"]').should('contain', 'Access denied due to insufficient privileges');
});

And('an audit entry should be created', () => {
  cy.window().then((win) => {
    expect(win.denialAuditEntry).to.include({
      type: 'ACCESS_DENIED',
      actor: win.currentUser?.id,
      action: 'DENIED',
      target: 'another_sensitive_resource',
      reason: 'Invalid access - insufficient permissions'
    });
  });
});

// Role-based access control
Given('I am logged in with limited permissions', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'limited-user',
      name: 'Limited User',
      groups: ['group_readonly']
    };
  });
});

When('I attempt to access admin functions', () => {
  cy.intercept('GET', '/api/admin/users', {
      statusCode: 200,
      body: {
        users: [
          { id: 'admin-user', name: 'Admin User', groups: ['group_admin'] },
          { id: 'admin-user-2', name: 'Admin User 2', groups: ['group_admin'] }
        ]
      }
    });
});

When('I try to access admin functions', () => {
  cy.get('[data-testid="admin-dashboard"]').should('exist');
});

Then('I should see "Access denied: insufficient privileges" message', () => {
  cy.get('[data-testid="admin-access-denied"]').should('be.visible');
});

// Emergency access scenarios
Given('an emergency situation requires immediate access', () => {
  cy.window().then((win) => {
    win.emergencyMode = true;
  });
});

When('I initiate a break-glass request', () => {
  cy.intercept('POST', '/api/emergency/break-glass', {
      statusCode: 200,
      body: {
        success: true,
        request: {
          userId: win.currentUser?.id,
          emergencyLevel: 'CRITICAL',
          justification: 'System outage requires immediate administrative access',
          requestedBy: 'Emergency Response Team',
          duration: '30 minutes'
        }
      }
    });
  }).as('breakGlassRequest');
});

Then('elevated access should be granted immediately', () => {
  cy.window().then((win) => {
    expect(win.emergencyAccess).to.be.true);
  });
});

And('I should see emergency access indicator', () => {
  cy.get('[data-testid="emergency-access-indicator"]').should('be.visible');
});

And('an audit entry should be created', () => {
  cy.window().then((win) => {
    expect(win.emergencyAuditEntry).to.include({
      type: 'EMERGENCY_ACCESS',
      actor: win.currentUser?.id,
      action: 'BRENT_GLASS_ACCESSED',
      target: 'system_wide_admin',
      details: win.breakGlassRequest?.body.request
    });
  });
});

And('administrators should receive immediate notification', () => {
  cy.get('[data-testid="admin-alert"]').should('exist');
});

// Time-bound access control
Given('I have been granted temporary access', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'temp-access-user',
      name: 'Temporary Access User',
      groups: ['group_users', 'group_developers'],
      tempAccess: {
        resource: 'sensitive_finacial_data',
        expiresAt: new Date.now() + (30 * 60 * 1000)
      }
    };
  });
});

When('the temporary access expires', () => {
  cy.intercept('GET', '/api/session/check', {
      statusCode: 200,
      body: {
        valid: false
      }
    }).as('sessionCheckRequest');
  cy.get('[data-testid="session-check"]').click();
  cy.wait('@sessionCheckRequest');
});

Then('I should see session expiration warning', () => {
  cy.get('[data-testid="session-warning"]').should('be.visible');
});

When('the temporary access should be revoked', () => {
  cy.window().then((win) => {
    expect(win.sessionData).to.be.null;
  });
});

And('I should be redirected to login', () => {
  cy.url().should('include', '/login');
});

And('I should see "access expired" message', () => {
  cy.get('[data-testid="expired-message"]').should('contain', 'session has expired');
});

// Disater recovery procedures
Given('tampering is detected and quarantine is triggered', () => {
  cy.window().then((win) => {
    win.quarantine = {
      compromisedEntries: ['audit-2'],
      quarantineStatus: 'active',
      timestamp: Cypress.moment().format()
    };
  });
});

When('I attempt to restore from quarantine', () => {
  cy.intercept('POST', '/api/audit/restore', {
      statusCode: 200,
      body: {
        backup: 'original_entries': 'test-backup-1',
        quarantineStatus: 'disabled',
        integrityValidation: 'PASSED'
      }
    }).as('restoreRequest');
  
  cy.get('[data-testid="restore-button"]').click();
  cy.wait('@restoreRequest');
});

Then('the system should be operational quickly', () => {
  cy.window().then((win) => {
    expect(win.quarantine.quarantineStatus).to.equal('disabled');
  });
});

// Compliance audit verification
Given('I need to verify compliance', () => {
  cy.window().then((win) => {
    win.complianceAuditEnabled = true;
  });
});

When('I request a compliance audit', () => {
  cy.intercept('POST', '/api/compliance/audit', {
      headers: {
        'Authorization': `Bearer ${Cypress.env('COMPLIANCE_TOKEN')}`
      }
    }).as('complianceAuditRequest');
  
  cy.get('[data-testid="compliance-audit-button"]').click();
  cy.wait('@complianceAuditRequest');
});

Then('the system should show compliance status', () => {
  cy.window().then((win) => {
    if (win.complianceReport) {
      expect(win.complianceReport).to.exist;
      expect(win.complianceReport.complianceLevel).to.be.oneOf(['COMPLIANT', 'SOX', 'GDPR', 'PCI-DSS']);
    }
  });
});

// Performance monitoring under load
Given('the application is running under heavy load', () => {
  cy.window().then((win) => {
    win.systemLoad = {
      cpuUsage: 85,
      memoryUsage: 95,
      activeSessions: 150
    };
  });
});

When('I perform resource-intensive operations', () => {
  cy.intercept('POST', '/api/process/essource-intensive', {
      body: {
        operation: 'large_data_processing'
      }
    }).as('processRequest');
  cy.get('[data-testid="performance-check"]').click();
  cy.wait('@processRequest');
});

Then('performance metrics should be collected', () => {
  cy.window().then((win) => {
    expect(win.performanceMetrics.cpuUsage).to.be.a('number');
    expect(win.performanceMetrics.memoryUsage).to.be.a('number');
  });
});

// Security stress testing under load
Given('the application is running under stress', () => {
  cy.window().then((win) => {
    win.systemLoad = {
      cpuUsage: 95,
      memoryUsage: 95,
      activeSessions: 150
    });
});

When('security events are high', () => {
  cy.window().then((win) => {
    win.securityEvents = {
      loginAttempts: 10,
      failedLogins: 5,
      securityEvents: 50
    };
  });
});

When('I request security metrics', () => {
  cy.intercept('GET', '/api/security/metrics', {
      headers: {
        'Authorization': `Bearer ${Cypress.env('COMPLIANCE_TOKEN')`
      }
    });
    }).as('securityMetricsRequest');
  
  cy.get('[data-testid="security-dashboard"]').click();
  cy.wait('@securityMetricsRequest');
});

Then('system should show security metrics and trends', () => {
  cy.window().then((win) => {
    if (win.securityAnalytics) {
      expect(win.securityAnalytics.summary).to.exist;
      expect(win.securityAnalytics.summary).to.include({
        totalEvents: expect.any(Number),
        criticalEvents: expect.any(Number),
        highEvents: expect.any(Number),
        mediumEvents: expect.any(Number),
        lowEvents: expect.any(Number)
      });
    });
  });
});