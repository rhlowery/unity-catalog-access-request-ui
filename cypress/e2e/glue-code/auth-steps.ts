import { defineParameterType } from '@badeball/cypress-cucumber-preprocessor';
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { expect } from '@badeball/cypress-cucumber-preprocessor';

// Correct type declarations for commands
declare global {
  cy: Cypress.Cypress;
  expect: typeof Cypress.Expect;
}

// Define parameter types
defineParameterType({
  name: 'loginAttempts',
  transformer: (value: number) => {
    return value;
  },
});

defineParameterType({
  name: 'sessionDuration',
  transformer: (value: number) => {
    return value;
  },
});

defineParameterType({
  name: 'keyRotationVersion',
  transformer: (value: number) => {
    return value;
  },
});

defineParameterType({
  name: 'contentSecurityPolicy',
  transformer: (value: { 
    frameOptions?: string,
    imgSrc?: string, 
    sandbox?: boolean,
    reportTo?: string 
  }) => {
      return {
      frameOptions: value?.frameOptions || 'DENY',
      imgSrc: value?.imgSrc || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAy...',
      sandbox: value?.sandbox || false,
      reportOnly: value?.reportOnly || false
    };
  },
});

// Given steps for authentication
Given('I am on the login page', () => {
  cy.visit('/login');
});

// Given steps for login attempts
Given('the login attempt count is {loginAttempts}', (table) => {
  table: [
    ['attempt_count', loginAttempts]
  ];
});

// Rate limiting scenarios
When('I attempt to log in after exceeding max attempts', () => {
  cy.intercept('POST', '/api/auth/login', {
      statusCode: 429,
      body: { error: 'Too many login attempts. Please try again later.' }
    }).as('rateLimitRequest');
});

// Session management scenarios
Given('I have a valid session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'test-session',
      userId: 'test-user',
      expiresAt: new Date(Date.now() + (8 * 60 * 1000)), // 8 hours
      isActive: true
    };
  });
});

// Access control scenarios
Given('I am logged in with specific permissions', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'test-user',
      name: 'Test User',
      groups: ['group_users', 'group_developers']
    };
  });
});

When('I request access to a resource I am authorized for', () => {
  cy.intercept('POST', '/api/access/grant', {
      statusCode: 201,
      body: {
        success: true,
        accessId: 'access-123',
        resource: 'sensitive_data',
        permissions: ['SELECT', 'READ'],
        justification: 'Business analysis report generation'
      }
    });
});

When('I request access to a resource I lack permissions for', () => {
  cy.intercept('POST', '/api/access/denied', {
      statusCode: 403,
      body: {
        error: 'Access denied: insufficient privileges',
        requiredPermissions: ['ADMIN', 'DELETE']
      }
    });
});

// Emergency access scenarios
Given('an emergency is declared', () => {
  cy.window().then((win) => {
    win.emergencyMode = true;
  });
});

When('I request emergency access', () => {
  cy.intercept('POST', '/api/emergency/access', {
      body: {
        urgency: 'CRITICAL',
        justification: 'System outage requires immediate administrative access',
        requestor: win.currentUser?.name
      }
    });
  });
});

Then('elevated access should be granted immediately', () => {
  cy.window().then((win) => {
    expect(win.emergencyAccess).to.be.true;
  });
});

// Session timeout scenarios
Given('I have an active session that is 30 minutes from expiration', () => {
  cy.window().then((win) => {
    win.sessionData.expiresAt = Date.now() - (30 * 60 * 1000);
    });
});

When('the system checks the session', () => {
  cy.window().then((win) => {
    win.checkSession();
  });
});

Then('I should receive a session expiration warning', () => {
  cy.get('[data-testid="session-warning"]').should('be.visible');
});

// Session termination scenarios
Given('I have an expired session', () => {
  cy.window().then((win) => {
    win.sessionData = {
      id: 'expired-session',
      isActive: false,
      expiresAt: Date.now() - (5 * 60 * 1000)
    };
  });
});

When('I interact with the application', () => {
  cy.get('[data-testid="dashboard-link"]').click();
});

Then('I should be redirected to the login page', () => {
  cy.url().should('include', '/login');
});

And('I should see a session expiration message', () => {
  cy.get('[data-testid="expired-message"]').should('be.visible');
});

// Rate limiting enforcement
Given('the lockout duration has increased', () => {
  cy.window().then((win) => {
    win.lockoutDuration = 30 * 60 * 1000; // 30 minutes
    });
});

When('I attempt to log in after lockout', () => {
  cy.intercept('POST', '/api/auth/login', {
      statusCode: 429,
      body: { error: 'Too many login attempts. Please try again later.', retryAfter: 900000 }
    }).as('rateLimitRequest');
  cy.get('[data-testid="login-button"]').click();
  cy.wait('@rateLimitRequest');
});

And('I should see an increased lockout message', () => {
  cy.get('[data-testid="lockout-duration"]').should('contain', 'Increased lockout duration to 30 minutes');
});

// Security breach detection scenarios
Given('suspicious activity is detected', () => {
  cy.window().then((win) => {
    win.suspiciousActivity = {
      ip: '192.168.1.100',
      userAgent: 'Malicious Bot',
      activityLog: ['multiple failed login attempts']
    };
  });
});

When('the security validation runs', () => {
  cy.intercept('POST', '/api/session/validate', {
    statusCode: 401,
      body: {
        error: 'Security validation failed'
      }
    }).as('securityValidationRequest');
});

Then('the session should be terminated', () => {
  cy.window().then((win) => {
    expect(win.sessionData).to.be.null;
  });
});

And('a security event should be logged', () => {
  cy.window().then((win) => {
    expect(win.securityEvents).to.include({
      type: 'SECURITY_VIOLATION',
      details: win.suspiciousActivity
    });
  });
});

// Rate limiting implementation
Given('I am approaching the rate limit', () => {
  cy.window().then((win) => {
    win.loginAttempts = 4; // One attempt away from limit
  });
});

When('I exceed the rate limit', () => {
  cy.intercept('POST', '/api/auth/login', {
      statusCode: 429,
      body: {
        error: 'Too many login attempts. Please try again later.',
        retryAfter: 900000
      }
    }).as('rateLimitRequest');
});

And('the lockout duration should increase', () => {
  cy.window().then((win) => {
    expect(win.lockoutDuration).to.be.greaterThan(900000);
  });
});

// Content Security Policy enforcement
Given('the application has Content Security Policy enabled', () => {
  cy.window().then((win) => {
    win.contentSecurityPolicy = true;
  });
});

When('I navigate to any page', () => {
  cy.intercept('GET', '**', (req) => {
      req.headers = {
        'Content-Security-Policy': 'default-src https://localhost:3000',
        'X-Frame-Options': 'DENY'
      }
    }).as('cspRequest');
});

// Multi-approval workflows
Given('an access request requires my approval', () => {
  cy.window().then((win) => {
    win.approvers = [
      {
        id: 'approver-1',
        name: 'Senior Approver',
        status: 'PENDING'
      },
      {
        id: 'approver-2',
        name: 'Department Head',
        status: 'PENDING'
      }
    ];
  });
});

When('I review the request', () => {
  cy.visit('/approver/request/req-1');
});

And('I approve the request', () => {
  cy.intercept('PUT', '/api/approve/req-1/approve', {
    statusCode: 200,
      body: {
        approver: 'senior_approver',
        status: 'APPROVED',
        approverId: 'approver-1'
      }
    }).as('approvalRequest');
});

Then('the request should be updated', () => {
  cy.window().then((win) => {
    expect(win.approvers[0].status).to.equal('APPROVED');
    expect(win.approvers[0].approverId).to.equal('approver-1');
  });
});

// Role-based access control
Given('I have limited permissions', () => {
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
      body: { users: [] }
    });
});

When('I try to perform admin actions', () => {
  cy.get('[data-testid="admin-actions"]').click();
});

Then('I should see access denied', () => {
  cy.get('[data-testid="admin-access-denied"]').should('be.visible');
});

// Emergency access with time restrictions
Given('an emergency situation requires limited-time access', () => {
  cy.window().then((win) => {
    win.emergencyAccess = {
      duration: '30_minutes',
      purpose: 'System maintenance',
      justification: 'Scheduled maintenance window'
    };
  });
});

When('I request emergency access', () => {
  cy.intercept('POST', '/api/emergency/access', {
      body: {
        urgency: 'CRITICAL',
        justification: 'System maintenance window'
      }
    }).as('emergencyAccessRequest');
});

Then('elevated access should be granted with time limitations', () => {
  cy.window().then((win) => {
    expect(win.emergencyAccess).to.be.true;
    expect(win.emergencyAccess.duration).to.equal('30_minutes');
  });
});

// Compliance audit trail verification
Given('a compliance audit is required', () => {
  cy.window().then((win) => {
    win.complianceAuditEnabled = true;
    });
});

When('I request a compliance audit', () => {
  cy.intercept('GET', '/api/compliance/audit-trail', {
    headers: {
        Authorization: `Bearer ${Cypress.env('COMPLIANCE_TOKEN')}`
      }
    }).as('complianceAuditRequest');
});

Then('the system should validate compliance', () => {
  cy.window().then((win) => {
    expect(win.complianceReport).to.exist;
    expect(win.complianceReport.complianceLevel).to.be.oneOf(['COMPLIANT', 'SOX', 'GDPR', 'PCI-DSS']);
  });
});

// Disatster recovery simulation
Given('a disaster recovery scenario is triggered', () => {
  cy.window().then((win) => {
    win.disasterRecovery = {
      isActive: true
    };
  });
});

When('the backup is created', () => {
  cy.window().then((win) => {
    expect(win.backupStatus).to.exist;
  });
});

When('the recovery is complete', () => {
  cy.window().then((win) => {
    cy.get('[data-testid="recovery-status"]').should('contain', 'Recovery completed successfully');
  });
});

// Performance monitoring under load
Given('I am under heavy application load', () => {
  cy.window().then((win) => {
    win.systemMetrics = {
      cpuUsage: 85,
      memoryUsage: 95,
      activeSessions: 150
    };
  });
});

// Performance monitoring with resource-intensive operations
Given('I perform resource-intensive operations', () => {
  cy.intercept('POST', '/api/process/intensive-data', {
      body: { operation: 'large_data_processing' }
    }).as('processRequest');
});

When('the system monitors performance', () => {
  cy.window().then((win) => {
    expect(win.performanceMetrics).to.include('resource_intensive_operation');
  });
});

// Security metrics under attack simulation
Given('the system is under security stress testing', () => {
  cy.window().then((win) => {
    win.securityMetrics = {
      failedLogins: 25,
      blockedRequests: 150,
      securityEvents: 50
    };
  });
});

// Recovery time testing
Given('a backup is available', () => {
  cy.window().then((win) => {
    win.backupAvailable = true;
  });
});

When('I restore from backup', () => {
  cy.intercept('POST', '/api/backup/restore', {
      body: { backupId: 'backup-001' }
    }).as('restoreRequest');
});

And('the system should be operational quickly', () => {
  cy.window().then((win) => {
    expect(win.isOperational).to.be.true;
    });
});