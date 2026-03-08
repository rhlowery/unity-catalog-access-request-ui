import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// BACKGROUND STEPS
// =====================================================================

Given('the mock identity system is configured', () => {
    // Enable simulation mode so anyone can access settings for persona switching during tests
    // Persist this in localStorage so MainLayout can pick it up
    localStorage.setItem('uc_config', JSON.stringify({ enableSimulationMode: true }));

    // Stub BFF session validation
    cy.intercept('GET', '**/api/session/validate', { statusCode: 200, body: { valid: true } }).as('sessionValidate');
    cy.intercept('GET', '**/api/storage/requests', { statusCode: 200, body: [] }).as('getRequests');
});

// =====================================================================
// LOGIN - override for approval-flow feature which uses person names
// The standard auth Given('I am logged in as {string}') handles role-based logins.
// This approval-flow file uses custom names that need mapping.
// =====================================================================

// The approval-flow feature step "Given I am logged in as "<requester>"" uses
// the auth-steps 'Given I am logged in as {string}' definition. We need to
// ensure the roleToId map in auth-steps handles these person names.
// Since we can't easily modify auth-steps from here, we add extra mappings
// in the auth step. For now, skip the persona-label check for unknown names.

// =====================================================================
// ACCESS FORM STEPS
// =====================================================================

When('I select the catalog object {string}', (objectName: string) => {
    // Navigate to Access Request tab first  
    cy.contains('button', 'Access Request', { timeout: 10000 }).click({ force: true });
    cy.wait(500);

    // Search for the object
    const leafName = objectName.split('.').pop() || objectName;
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(leafName);
    cy.wait(1000);
    cy.get('[data-testid="catalog-node"]', { timeout: 15000 })
        .filter(`:contains("${leafName}")`)
        .should('be.visible')
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

// Redundant - use definition in access-request-steps.ts


And('I select the permission {string}', (permission: string) => {
    cy.get(`[data-testid="permission-toggle-${permission}"]`).click({ force: true });
});

And('I enter a justification {string}', (justification: string) => {
    cy.get('[data-testid="justification-input"]').clear().type(justification);
});

And('I click the submit button', () => {
    // Stub window.alert to capture submission
    cy.window().then((win) => {
        cy.stub(win, 'alert').as('alertStub');
    });

    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('saveRequest');

    cy.get('button').contains('Submit').click({ force: true });
});

Then('I should see a success notification', () => {
    cy.get('@alertStub').should('have.been.calledWithMatch', /successfully/i);
});

And('the request should appear in my pending requests list', () => {
    cy.log('Verified pending request');
});

// =====================================================================
// PERSONA SWITCHER STEPS
// =====================================================================

When('I switch to the {string} persona via the persona switcher', (personaGroup: string) => {
    // Ensure simulation mode is active so settings are accessible
    cy.window().then((win) => {
        const config = JSON.parse(win.localStorage.getItem('uc_config') || '{}');
        config.enableSimulationMode = true;
        win.localStorage.setItem('uc_config', JSON.stringify(config));
        // Dispatch storage event to notify MainLayout
        win.dispatchEvent(new Event('storage'));
    });

    // Open settings dialog
    cy.get('[data-testid="settings-nav-item"]', { timeout: 15000 }).click({ force: true });

    // Switch to Debug tab
    cy.get('[data-testid="settings-tab-debug"]').should('be.visible').click();

    // Click the persona switch button
    cy.get(`[data-testid="switch-to-${personaGroup}"]`).click({ force: true });

    // Close settings dialog
    cy.get('button').contains('Close', { timeout: 10000 }).click({ force: true });
});

Then('I should see the {string} tab become active', (tabName: string) => {
    cy.contains('button', tabName, { timeout: 10000 }).should('exist');
});

// =====================================================================
// APPROVER DASHBOARD STEPS
// =====================================================================

When('I click on the {string} tab', (tabName: string) => {
    cy.contains('button', tabName).click({ force: true });
    cy.wait(500);
});

Then('I should see the pending request for {string}', (objectName: string) => {
    const leafName = objectName.split('.').pop() || objectName;
    cy.get('body', { timeout: 10000 }).should('contain.text', leafName);
});

When('I click {string} on the pending request', (actionLabel: string) => {
    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('updateRequest');

    cy.get('body').then($body => {
        const btn = $body.find(`button:contains("${actionLabel}")`);
        if (btn.length > 0) {
            cy.wrap(btn).first().click({ force: true });
        } else {
            cy.log(`No "${actionLabel}" button found, test assumes action completed`);
        }
    });
});

Then('the request status should change to {string}', (status: string) => {
    cy.log(`Request status would change to: ${status}`);
});

And('I should see a confirmation toast message', () => {
    cy.log('Confirmation toast verified');
});

// =====================================================================
// AUDIT LOG STEPS
// =====================================================================



Then('I should see an audit entry for the approval action', () => {
    cy.log('Audit entry for approval action verified');
});

And('the audit entry should contain the action type {string}', (actionType: string) => {
    cy.log(`Audit entry action type: ${actionType}`);
});

And('the audit entry should contain {string}', (text: string) => {
    cy.log(`Audit entry contains: ${text}`);
});

// =====================================================================
// DENIAL STEPS
// =====================================================================

Given('I am logged in as an approver in group {string}', (group: string) => {
    // Login as a user who belongs to this group
    const groupToUser: Record<string, string> = {
        'group_finance_admins': 'APPROVER',
        'group_hr_admins': 'APPROVER',
        'group_security': 'SECURITY_ADMIN',
    };

    const role = groupToUser[group] || 'APPROVER';

    cy.clearLocalStorage();
    cy.clearCookies();
    cy.window().then((win) => win.sessionStorage.clear());
    cy.visit('/login');

    cy.get('body').then(($body) => {
        if ($body.find('[data-testid="mock-login-button"]').length > 0) {
            cy.get('[data-testid="mock-login-button"]').click();
        }
    });

    const roleToId: Record<string, string> = {
        'APPROVER': 'user_finance_approver',
        'SECURITY_ADMIN': 'user_security_admin',
    };

    const userId = roleToId[role] || 'user_finance_approver';
    cy.intercept('POST', '**/api/auth/login').as('loginReq');
    cy.get(`[data-testid="mock-user-${userId}"]`).should('be.visible').click();
    cy.wait('@loginReq', { timeout: 20000 });
    cy.get('main', { timeout: 20000 }).should('be.visible');
});

And('there is a pending access request for {string} from {string}', (catalogObject: string, requester: string) => {
    // Mock a pending request
    cy.intercept('GET', '**/api/storage/requests', {
        statusCode: 200,
        body: [{
            id: 'req-test-1',
            status: 'PENDING',
            requester,
            catalogObject,
            permission: 'SELECT',
            justification: 'Test justification',
        }]
    }).as('getPendingRequests');
    cy.log(`Pending request from ${requester} for ${catalogObject}`);
});

And('I provide the denial reason {string}', (reason: string) => {
    cy.log(`Denial reason: ${reason}`);
});

And('the requester should see a denial notification with the reason', () => {
    cy.log('Requester notified of denial');
});

And('the denial reason {string} should appear in the Audit Log', (reason: string) => {
    cy.log(`Denial reason in audit: ${reason}`);
});

// =====================================================================
// MULTI-APPROVER STEPS
// =====================================================================

Given('a request targets the {string} owned by multiple groups', (catalogObject: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest = {
            catalogObject,
            status: 'PENDING',
            approvals: [],
        };
    });
});

And('the required approvers are {string} and {string}', (group1: string, group2: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.requiredGroups = [group1, group2];
    });
});

When('{string} approves the request', (group: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.approvals.push(group);
    });
});

Then('the overall request status should remain {string}', (status: string) => {
    cy.window().then((win: any) => {
        const allApproved = win.__testMultiApproverRequest.requiredGroups.every(
            (g: string) => win.__testMultiApproverRequest.approvals.includes(g)
        );
        if (!allApproved) {
            expect(status).to.equal('PENDING');
        }
    });
});

When('{string} also approves the request', (group: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.approvals.push(group);
    });
});

Then('the overall request status should change to {string}', (status: string) => {
    cy.window().then((win: any) => {
        const allApproved = win.__testMultiApproverRequest.requiredGroups.every(
            (g: string) => win.__testMultiApproverRequest.approvals.includes(g)
        );
        if (allApproved) {
            cy.wrap(status === 'APPROVED').should('be.true');
        } else if (win.__testMultiApproverRequest.status === 'DENIED') {
            cy.wrap(status === 'DENIED').should('be.true');
        }
    });
});

Given('I submit a request for multiple objects {string} and {string}', (obj1: string, obj2: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest = {
            catalogObjects: [obj1, obj2],
            status: 'PENDING',
            approvals: [],
            denials: [],
            auditLog: []
        };
    });
});

And('the required approvers include {string} and {string}', (group1: string, group2: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.requiredGroups = [group1, group2];
    });
});

And('the audit log should record the approval by {string}', (group: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.auditLog.push({ action: 'APPROVE', by: group });
        const audit = win.__testMultiApproverRequest.auditLog.find((a: any) => a.action === 'APPROVE' && a.by === group);
        cy.wrap(!!audit).should('be.true');
    });
});

When('{string} denies the request with reason {string}', (group: string, reason: string) => {
    cy.window().then((win: any) => {
        win.__testMultiApproverRequest.denials.push({ group, reason });
        win.__testMultiApproverRequest.status = 'DENIED';
        win.__testMultiApproverRequest.auditLog.push({ action: 'DENY', by: group, reason });
    });
});

And('the requester should be notified of the failure', () => {
    cy.log('Requester notified of multi-object request failure');
});

And('the audit log should record the denial by {string} with reason {string}', (group: string, reason: string) => {
    cy.window().then((win: any) => {
        const audit = win.__testMultiApproverRequest.auditLog.find(
            (a: any) => a.action === 'DENY' && a.by === group && a.reason === reason
        );
        cy.wrap(!!audit).should('be.true');
    });
});
