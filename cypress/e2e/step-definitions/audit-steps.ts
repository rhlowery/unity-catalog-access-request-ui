import { Given, When, Then, defineParameterType } from '@badeball/cypress-cucumber-preprocessor';

// Audit integrity and tamper detection step definitions
defineParameterType({
  name: 'auditEntry',
  regexp: /[^\\n]+/,
  transformer: (value: any) => {
    const { id, timestamp, type, actor, action, target, details, signature, hash, previousHash } = value;
    return { id, timestamp, type, actor, action, target, details, signature, hash, previousHash };
  },
});

// And step helper
const And = Then;

// Audit trail creation scenarios
Given('I am logged in as a regular user', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'test-user',
      name: 'Test User',
      groups: ['group_users', 'group_developers']
    };
  });
});

When('I perform a sensitive action', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/audit/log', (req) => {
      req.alias = 'auditLogRequest';
      req.body = {
        userId: win.currentUser?.id,
        action: 'ACCESS_GRANTED',
        target: 'sensitive_data_resource',
        details: {
          resourceType: 'table',
          permissions: ['SELECT', 'INSERT'],
          justification: 'Business analysis report generation'
        }
      };
      req.reply({
        statusCode: 201,
        body: {
          success: true,
          auditEntry: {
            id: 'audit-1',
            timestamp: Date.now(),
            type: 'ACCESS',
            actor: win.currentUser?.id,
            action: 'GRANTED_ACCESS',
            target: 'sensitive_data_resource',
            details: {
              resourceType: 'table',
              permissions: ['SELECT', 'INSERT'],
              justification: 'Business analysis report generation'
            },
            signature: 'test-signature',
            hash: 'test-hash'
          }
        }
      });
    }).as('auditLogRequest');
     
    cy.get('[data-testid="grant-access-button"]').click();
    cy.wait('@auditLogRequest');
  });
});

Then('an audit entry should be created with cryptographic protection', () => {
  cy.window().then((win) => {
    const auditEntry = win.auditEntry;
    expect(auditEntry.id).to.be.a('string');
    expect(auditEntry.type).to.equal('ACCESS');
    expect(auditEntry.actor).to.equal(win.currentUser?.id);
    expect(auditEntry.signature).to.exist;
    expect(auditEntry.hash).to.exist;
  });
});

And('the entry should be stored in tamper-resistant storage', () => {
  cy.window().then((win) => {
    expect(win.auditStorage).to.include({
      id: 'audit-1',
      timestamp: Date.now(),
      type: 'ACCESS',
      actor: win.currentUser?.id,
      action: 'GRANTED_ACCESS',
      target: 'sensitive_data_resource',
      details: expect.any(Object),
      signature: 'test-signature',
      hash: 'test-hash'
    });
  });
});

// Real-time tamper detection scenarios
Given('I have a valid audit trail', () => {
  cy.window().then((win) => {
    win.auditTrail = [
      {
        id: 'audit-1',
        timestamp: Date.now() - (10 * 60 * 1000),
        type: 'ACCESS',
        actor: 'test-user',
        action: 'GRANTED_ACCESS',
        target: 'sensitive_data_resource',
        details: { resourceType: 'table' },
        signature: 'test-signature',
        hash: 'audit-hash-1',
        previousHash: null
      },
      {
        id: 'audit-2',
        timestamp: Date.now() - (5 * 60 * 1000),
        type: 'ACCESS',
        actor: 'test-user',
        action: 'GRANTED_ACCESS',
        target: 'sensitive_data_resource',
        details: { resourceType: 'table' },
        signature: 'test-signature',
        hash: 'audit-hash-2',
        previousHash: 'audit-hash-1'
      }
    ];
  });
});

When('an attacker attempts to modify the audit log directly', () => {
  cy.intercept('PUT', '/api/audit/modify', {
    statusCode: 403,
    body: { error: 'Direct audit modification not allowed' }
  }).as('tamperAttempt');
  
  cy.window().then((win) => {
    // Simulate localStorage modification
    cy.window().then((winObj) => {
      winObj.localStorage.setItem('acs_audit_log', 'modified-data');
    });
  });
  
  cy.window().then(() => {
    cy.intercept('GET', '/api/audit/integrity-check', {
      statusCode: 200,
      body: {
        valid: false,
        violations: ['STORAGE_INTEGRITY_BREACH', 'HASH_CHAIN_BROKEN'],
        details: 'Direct audit modification detected'
      }
    }).as('integrityCheckRequest');
   
    cy.get('[data-testid="integrity-check"]').click();
    cy.wait('@integrityCheckRequest');
  });
});

Then('tamper detection should trigger immediately', () => {
  cy.window().then((win) => {
    expect(win.auditEvents).to.include({
      type: 'AUDIT_INTEGRITY_VIOLATION',
      severity: 'CRITICAL',
      timestamp: Cypress.moment().format()
    });
  });
});

And('compromised entries should be automatically quarantined', () => {
  cy.window().then((win) => {
    expect(win.quarantine).to.include({
      compromisedEntries: ['audit-2'],
      quarantineStatus: 'active',
      timestamp: Cypress.moment().format()
    });
  });
});

And('administrators should be notified', () => {
  cy.get('[data-testid="admin-alert"]').should('exist');
});

// Hash chain validation scenarios
Given('I have multiple audit entries', () => {
  cy.window().then((win) => {
    win.auditTrail = [
      {
        id: 'audit-1',
        timestamp: Date.now() - (20 * 60 * 1000),
        type: 'ACCESS',
        actor: 'test-user',
        action: 'GRANTED_ACCESS',
        target: 'sensitive_data_resource',
        details: { resourceType: 'table' },
        signature: 'test-signature',
        hash: 'audit-hash-1',
        previousHash: null
      },
      {
        id: 'audit-2',
        timestamp: Date.now() - (15 * 60 * 1000),
        type: 'ACCESS',
        actor: 'test-user',
        action: 'GRANTED_ACCESS',
        target: 'sensitive_data_resource',
        details: { resourceType: 'table' },
        signature: 'test-signature',
        hash: 'audit-hash-2',
        previousHash: 'audit-hash-1'
      },
      {
        id: 'audit-3',
        timestamp: Date.now() - (10 * 60 * 1000),
        type: 'ACCESS',
        actor: 'test-user',
        action: 'GRANTED_ACCESS',
        target: 'sensitive_data_resource',
        details: { resourceType: 'table' },
        signature: 'test-signature',
        hash: 'audit-hash-3',
        previousHash: 'audit-hash-2'
      }
    ];
  });
});

When('I run hash chain validation', () => {
  cy.intercept('GET', '/api/audit/hash-chain-check', {
    statusCode: 200,
    body: {
      valid: true,
      message: 'Hash chain is valid'
    }
  }).as('hashChainCheckRequest');
   
  cy.get('[data-testid="hash-chain-check"]').click();
  cy.wait('@hashChainCheckRequest');
});

Then('every consecutive entry should have a valid hash link', () => {
  cy.window().then((win) => {
    expect(win.hashChainValid).to.be.true;
    expect(win.integrityReport).to.exist;
  });
});

And('any broken chains should be flagged', () => {
  cy.window().then((win) => {
    // Simulate broken chain by modifying one entry
    if (win.auditTrail && win.auditTrail.length > 1) {
      win.auditTrail[1].previousHash = 'invalid-hash';
    }
  });
   
  cy.get('[data-testid="hash-chain-check"]').click();
  cy.wait('@hashChainCheckRequest');
   
  cy.window().then((win) => {
    expect(win.hashChainValid).to.be.false;
    expect(win.integrityReport).to.include('BROKEN_CHAIN_DETECTED');
  });
});

// Comprehensive integrity verification
Given('I want to verify the complete audit trail integrity', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/audit/comprehensive-verification', {
      statusCode: 200,
      body: {
        valid: true,
        signatureValidation: 'PASSED',
        hashChainValidation: 'PASSED',
        complianceLevel: 'COMPLIANT',
        totalEntries: win.auditTrail?.length || 0
      }
    }).as('comprehensiveVerificationRequest');
   
    cy.get('[data-testid="comprehensive-verify"]').click();
    cy.wait('@comprehensiveVerificationRequest');
  });
});

Then('the system should report compliance status', () => {
  cy.window().then((win) => {
    expect(win.complianceReport).to.exist;
    expect(win.complianceReport.complianceLevel).to.equal('COMPLIANT');
  });
});

// Access control and authorization scenarios
Given('I am logged in as a regular user', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'test-user',
      name: 'Test User',
      groups: ['group_users', 'group_developers']
    };
  });
});

When('I submit an access request with proper justification', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/access/requests', {
      statusCode: 202,
      body: {
        success: true,
        requestId: 'req-1',
        status: 'PENDING',
        request: {
          userId: win.currentUser?.id,
          resource: 'sensitive_financial_data',
          permissions: ['SELECT', 'READ'],
          justification: 'Q4 2024 financial report preparation',
          businessJustification: 'Quarterly financial analysis requiring access to sensitive financial data'
        }
      },
      auditEntry: {
        id: 'audit-req-1',
        timestamp: Date.now(),
        type: 'REQUEST_CREATED',
        actor: win.currentUser?.id,
        action: 'SUBMITTED',
        target: 'sensitive_financial_data',
        details: expect.any(Object)
      }
    };
  }).as('accessRequest');
});

And('the request should be created in "PENDING" status', () => {
  cy.window().then((win) => {
    expect(win.accessRequest.status).to.equal('PENDING');
    expect(win.accessRequest.requestId).to.equal('req-1');
  });
});

// Multi-stage approval workflow
Given('I am logged in as an approver', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'approver-user',
      name: 'Test Approver',
      groups: ['group_approvers', 'group_security']
    };
  });
});

And('there is a pending request requiring my approval', () => {
  cy.window().then((win) => {
    cy.intercept('GET', '/api/access/requests', {
      statusCode: 200,
      body: {
        requests: [
          {
            id: 'req-1',
            status: 'PENDING',
            request: {
              userId: 'test-user',
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
});

When('I review the request', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'approver-user',
      name: 'Test Approver',
      groups: ['group_approvers', 'group_security']
    };
  });
});

And('I approve the request', () => {
  cy.window().then((win) => {
    cy.intercept('PUT', '/api/access/requests/req-1/approve', {
      statusCode: 200,
      body: {
        success: true,
        request: {
          status: 'APPROVED',
          approver: {
            id: win.currentUser?.id,
            name: 'Test Approver'
          }
        }
      };
    }).as('approvalRequest');
  });
});

And('the request should change to "APPROVED" status', () => {
  cy.window().then((win) => {
    expect(win.approvalStatus).to.equal('APPROVED');
  });
});

And('I should see the approval in my dashboard', () => {
  cy.visit('/approver-dashboard');
  cy.get('[data-testid="request-req-1"]').should('contain', 'APPROVED');
});

And('the requesting user should receive a notification', () => {
  cy.visit('/dashboard');
  cy.get('[data-testid="approval-notification"]').should('contain', 'Your access request has been approved');
});

And('an audit entry should be created for the approval', () => {
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
  cy.window().then((win) => {
    cy.intercept('GET', '/api/admin/users', {
      statusCode: 200,
      body: {
        users: [
          { id: 'admin-user', name: 'Admin User', groups: ['group_admin'] },
          { id: 'admin-user-2', name: 'Admin User 2', groups: ['group_admin'] }
        ]
      }
    }).as('getUsersRequest');
   
    cy.visit('/admin-dashboard');
    cy.get('[data-testid="admin-users-button"]').click();
    cy.wait('@getUsersRequest');
  });
});

When('I try to access admin functions', () => {
  cy.get('[data-testid="admin-dashboard"]').should('exist');
});

Then('I should see "Access denied: insufficient privileges" message', () => {
  cy.window().then((win) => {
    expect(win.accessDenied).to.be.true;
  });
});

And('an audit entry should be created for the unauthorized attempt', () => {
  cy.window().then((win) => {
    expect(win.unauthorizedAccessAuditEntry).to.include({
      type: 'UNAUTHORIZED_ACCESS',
      actor: 'limited-user',
      action: 'ATTEMPTED_ADMIN_ACCESS',
      target: '/api/admin/users',
      timestamp: expect.any(String),
      details: expect.any(Object)
    });
  });
});

// Emergency access scenarios
Given('an emergency situation requires immediate access', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'emergency-user',
      name: 'Emergency User',
      groups: ['group_emergency', 'group_admin']
    };
  });
});

When('I initiate a break-glass request', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/emergency/break-glass', {
      statusCode: 200,
      body: {
        success: true,
        request: {
          userId: win.currentUser?.id,
          emergencyLevel: 'CRITICAL',
          justification: 'System outage requires immediate administrative access',
          duration: '30_minutes',
          requestedBy: 'Emergency Response Team'
        }
      };
    });
  }).as('breakGlassRequest');
   
  cy.get('[data-testid="emergency-break-glass"]').click();
  cy.wait('@breakGlassRequest');
});

And('elevated access should be granted immediately', () => {
  cy.window().then((win) => {
    expect(win.emergencyAccess).to.equal(true);
  });
});

And('I should see emergency access in my dashboard', () => {
  cy.visit('/emergency-dashboard');
  cy.get('[data-testid="emergency-access-indicator"]').should('be.visible');
});

And('an audit entry should be created', () => {
  cy.window().then((win) => {
    expect(win.emergencyAuditEntry).to.include({
      type: 'EMERGENCY_ACCESS',
      actor: win.currentUser?.id,
      action: 'BREAK_GLASS_ACCESSED',
      target: 'system_wide_admin',
      details: win.breakGlassRequest?.body.request
    });
  });
});

// Time-bound access control
Given('I have been granted temporary access', () => {
  cy.window().then((win) => {
    win.currentUser = {
      id: 'temp-access-user',
      name: 'Temporary Access User',
      groups: ['group_users'],
      tempAccess: {
        resource: 'sensitive_financial_data',
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
        purpose: 'Q4 2024 financial report preparation'
      }
    };
  });
});

When('the temporary access expires', () => {
  cy.task({
    taskName: 'advanceTimeBy30Minutes',
    duration: 30 * 60 * 1000
  });
   
  cy.window().then((win) => {
    const isExpired = win.currentUser?.tempAccess ? 
      Date.now() >= win.currentUser.tempAccess.expiresAt : false;
    if (isExpired) {
      cy.log('Temporary access has expired');
    }
  });
});

When('I attempt to access the resource after expiration', () => {
  cy.get('[data-testid="financial-data-link"]').click();
});

Then('I should be redirected to the login page', () => {
  cy.url().should('include', '/login');
});

Then('I should see a "access expired" message', () => {
  cy.get('[data-testid="access-expired-message"]').should('contain', 'Your temporary access has expired');
});

And('the temporary access should be automatically revoked', () => {
  cy.window().then((win) => {
    expect(win.currentUser?.tempAccess).to.be.undefined;
  });
});

// Compliance and reporting
Given('a compliance audit is required', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/compliance/audit', {
      statusCode: 200,
      body: {
        complianceLevel: 'COMPLIANT',
        totalEntries: expect.any(Number),
        validatedEntries: expect.any(Number),
        violations: expect.any(Array)
      }
    }).as('complianceAuditRequest');
   
    cy.get('[data-testid="compliance-audit-button"]').click();
    cy.wait('@complianceAuditRequest');
  });
});

Then('the system should generate a compliance report', () => {
  cy.window().then((win) => {
    expect(win.complianceReport).to.exist;
    expect(win.complianceReport.complianceLevel).to.equal('COMPLIANT');
  });
});

// Performance monitoring
Given('the application is running under load', () => {
  cy.window().then((win) => {
    cy.intercept('GET', '/api/performance/metrics', {
      statusCode: 200,
      body: {
        cpuUsage: expect.any(Number),
        memoryUsage: expect.any(Number),
        activeSessions: expect.any(Number),
        auditStorageSize: expect.any(Number)
      }
    }).as('performanceMetricsRequest');
   
    cy.get('[data-testid="performance-check"]').click();
    cy.wait('@performanceMetricsRequest');
  });
});

Then('performance metrics should be collected', () => {
  cy.window().then((win) => {
    expect(win.performanceMetrics.cpuUsage).to.be.a('number');
    expect(win.performanceMetrics.memoryUsage).to.be.a('number');
  });
});

And('the system should show alerts when thresholds are breached', () => {
  cy.window().then((win) => {
    if (win.performanceMetrics.cpuUsage > 80) {
      expect(win.performanceAlerts).to.include('HIGH_CPU_USAGE');
    }
    if (win.performanceMetrics.memoryUsage > 90) {
      expect(win.performanceAlerts).to.include('HIGH_MEMORY_USAGE');
    }
  });
});

// Security event aggregation
Given('multiple security events are occurring', () => {
  cy.window().then((win) => {
    win.securityEvents = [
      {
        type: 'SECURITY_VIOLATION',
        severity: 'HIGH',
        timestamp: expect.any(String),
        details: expect.any(Object)
      },
      {
        type: 'SECURITY_VIOLATION',
        severity: 'CRITICAL',
        timestamp: expect.any(String),
        details: expect.any(Object)
      },
      {
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'MEDIUM',
        timestamp: expect.any(String),
        details: expect.any(Object)
      },
      {
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        timestamp: expect.any(String),
        details: expect.any(Object)
      }
    ];
  });
});

When('I request a security analytics report', () => {
  cy.window().then((win) => {
    cy.intercept('GET', '/api/security/analytics', {
      statusCode: 200,
      body: {
        events: win.securityEvents,
        summary: {
          totalEvents: expect.any(Number),
          criticalEvents: expect.any(Number),
          highEvents: expect.any(Number),
          mediumEvents: expect.any(Number),
          lowEvents: expect.any(Number),
          trends: expect.any(Object)
        }
      }
    }).as('securityAnalyticsRequest');
   
    cy.get('[data-testid="security-analytics-button"]').click();
    cy.wait('@securityAnalyticsRequest');
  });
});

Then('the system should show security metrics and trends', () => {
  cy.window().then((win) => {
    expect(win.securityAnalytics.summary).to.exist;
  });
});

// Disaster recovery scenarios
Given('a security breach is detected', () => {
  cy.window().then((win) => {
    win.securityBreach = {
      detected: true,
      severity: 'CRITICAL',
      timestamp: expect.any(String),
      details: {
        incidentId: 'security-bre-001',
        type: 'DATA_COMPROMISE',
        affectedSystems: ['authentication', 'audit_storage', 'session_management'],
        impact: 'HIGH',
        description: 'Detected unauthorized access to sensitive data'
      }
    };
  });
});

And('system triggers disaster recovery protocols', () => {
  cy.window().then((win) => {
    expect(win.disasterRecovery.activated).to.be.true;
  });
});

Then('all active sessions should be immediately invalidated', () => {
  cy.window().then((win) => {
    const allSessionsInvalidated = win.activeSessions?.every(session => !session.isActive);
    expect(allSessionsInvalidated).to.be.true;
  });
});

And('a security incident response should be initiated', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/security/incident-response', {
      statusCode: 200,
      body: {
        incidentId: win.securityBreach?.details?.incidentId,
        responseLevel: 'CRITICAL',
        action: 'INVALIDATE_ALL_SESSIONS',
        timestamp: expect.any(String)
      };
    }).as('incidentResponse');
   
    expect(win.incidentResponse.responseLevel).to.equal('CRITICAL');
  });
});

And('administrators should receive immediate notification', () => {
  cy.get('[data-testid="critical-incident-alert"]').should('exist');
});

And('backup and recovery procedures should be documented', () => {
  cy.window().then((win) => {
    expect(win.disasterRecovery.procedures).to.exist;
  });
});

// Cryptographic operations testing
Given('I need to encrypt sensitive data', () => {
  cy.window().then((win) => {
    win.testData = 'This is highly sensitive financial data that must be encrypted';
  });
});

When('I encrypt the data', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/crypto/encrypt', {
      statusCode: 200,
      body: {
        algorithm: 'AES-256-GCM',
        dataId: 'sensitive-financial-data-001',
        encryptedData: expect.any(String),
        iv: expect.any(String)
      }
    }).as('encryptRequest');
   
    cy.get('[data-testid="encrypt-button"]').click();
    cy.wait('@encryptRequest');
  });
});

Then('the data should be encrypted with AES-256', () => {
  cy.window().then((win) => {
    expect(win.encryptionResponse.algorithm).to.equal('AES-256-GCM');
    expect(win.encryptionResponse.dataId).to.equal('sensitive-financial-data-001');
  });
});

When('I decrypt the data with the correct key', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/crypto/decrypt', {
      statusCode: 200,
      body: {
        algorithm: 'AES-256-GCM',
        dataId: 'sensitive-financial-data-001',
        decryptedData: expect.any(String),
        success: true
      }
    }).as('decryptRequest');
   
    cy.get('[data-testid="decrypt-button"]').click();
    cy.wait('@decryptRequest');
  });
});

Then('the original data should be recovered', () => {
  cy.window().then((win) => {
    expect(win.decryptionResponse.decryptedData).to.equal('This is highly sensitive financial data that must be encrypted');
  });
});

And('invalid decryption should fail', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/crypto/decrypt', {
      statusCode: 200,
      body: {
        success: false,
        error: 'Invalid decryption key'
      }
    }).as('invalidDecryptRequest');
   
    cy.get('[data-testid="decrypt-button-wrong-key"]').click();
    cy.wait('@invalidDecryptRequest');
  });
});

Then('I should see an error message', () => {
  cy.get('[data-testid="decryption-error"]').should('contain', 'Invalid decryption key');
});

// Key derivation and rotation
Given('I need to rotate encryption keys', () => {
  cy.window().then((win) => {
    win.currentKeyVersion = 1;
    win.newKeyVersion = 2;
  });
});

When('I initiate key rotation', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/crypto/rotate-keys', {
      statusCode: 200,
      body: {
        success: true,
        oldKeyId: 'key-001',
        newKeyId: 'key-002',
        rotationReason: 'Scheduled quarterly rotation',
        effectiveAt: expect.any(String)
      }
    }).as('keyRotationRequest');
   
    cy.get('[data-testid="rotate-keys-button"]').click();
    cy.wait('@keyRotationRequest');
  });
});

Then('the system should use the new key for new operations', () => {
  cy.window().then((win) => {
    expect(win.currentKeyVersion).to.equal(2);
  });
});

And('I try to decrypt data with the old key after rotation', () => {
  cy.window().then((win) => {
    cy.intercept('POST', '/api/crypto/decrypt', {
      statusCode: 200,
      body: {
        success: false,
        error: 'Key version deprecated'
      }
    }).as('oldKeyDecryptRequest');
   
    cy.get('[data-testid="decrypt-with-old-key"]').click();
    cy.wait('@oldKeyDecryptRequest');
  });
});

Then('I should see a key version deprecated error', () => {
  cy.get('[data-testid="key-deprecated-error"]').should('contain', 'Key version deprecated');
});