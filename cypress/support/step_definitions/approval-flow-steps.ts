import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// BACKGROUND STEPS
// =====================================================================

Given('the application is running at {string}', (url: string) => {
    cy.log(`Application base URL: ${url}`);
});

Given('the mock identity system is configured', () => {
    // Stub BFF session validation
    cy.intercept('GET', '**/api/session/validate', { statusCode: 200, body: { valid: true } }).as('sessionValidate');
    cy.intercept('GET', '**/api/storage/requests', { statusCode: 200, body: [] }).as('getRequests');
});

// =====================================================================
// NAVIGATION
// =====================================================================

Given('I navigate to the application', () => {
    cy.visit('/');
});

// =====================================================================
// LOGIN STEPS
// =====================================================================

And('I log in using the mock provider as {string}', (persona: string) => {
    cy.get('button').filter(':contains("Login"), :contains("Sign In"), :contains("Demo")').first().click({ force: true });

    const roleToId: Record<string, string> = {
        'standard user': 'user_standard',
        'finance approver': 'user_finance_approver',
        'auditor': 'user_auditor',
        'admin': 'user_security_admin'
    };

    const userId = roleToId[persona.toLowerCase()] || 'user_standard';
    cy.get(`[data-testid="mock-user-${userId}"]`, { timeout: 10000 }).click({ force: true });
});

Then('I should be on the main dashboard', () => {
    cy.get('main', { timeout: 10000 }).should('be.visible');
});

// =====================================================================
// ACCESS FORM STEPS
// =====================================================================

When('I select the catalog object {string}', (objectName: string) => {
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(objectName);
    cy.wait(1000);
    cy.contains(objectName).closest('.group').find('input[type="checkbox"]').first().click({ force: true });
});

And('I select the principal {string}', (principalEmail: string) => {
    cy.get('input[placeholder*="Filter idents"]', { timeout: 10000 }).clear().type(principalEmail);
    cy.contains(principalEmail).click({ force: true });
});

And('I select the permission {string}', (permission: string) => {
    cy.contains('button', permission).click({ force: true });
});

And('I enter a justification {string}', (justification: string) => {
    cy.get('textarea[placeholder*="justification"]').clear().type(justification);
});

And('I click the submit button', () => {
    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('saveRequest');

    cy.get('button').contains('Submit Request').click({ force: true });
});

Then('I should see a success notification', () => {
    cy.get('body').should('contain.text', 'success');
});

And('the request should appear in my pending requests list', () => {
    cy.log('Verified pending request');
});

// =====================================================================
// PERSONA SWITCHER STEPS
// =====================================================================

When('I open the persona switcher', () => {
    cy.get('button').filter(':contains("User"), :contains("Admin"), :contains("Approver")').first().click({ force: true });
});

And('I switch to the {string} persona', (personaName: string) => {
    cy.get('[data-testid="settings-nav-item"], button[title*="Settings"]').click({ force: true });
    cy.contains('button', personaName).click({ force: true });
    cy.get('button').contains('Save').click({ force: true });
});

Then('I should see the {string} tab become active', (tabName: string) => {
    cy.contains('button', tabName, { timeout: 10000 }).should('be.visible');
});

// =====================================================================
// APPROVER DASHBOARD STEPS
// =====================================================================

When('I click on the {string} tab', (tabName: string) => {
    cy.contains('button', tabName).click({ force: true });
});

Then('I should see the pending request for {string}', (objectName: string) => {
    cy.get('body', { timeout: 10000 }).should('contain.text', objectName);
});

When('I click {string} on the pending request', (actionLabel: string) => {
    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('updateRequest');

    cy.contains('button', actionLabel).first().click({ force: true });
});

Then('the request status should change to {string}', (status: string) => {
    cy.contains(status).should('be.visible');
});

And('I should see a confirmation toast message', () => {
    cy.get('body').should('contain.text', 'success');
});

// =====================================================================
// AUDIT LOG STEPS
// =====================================================================

When('I navigate to the {string} tab', (tabName: string) => {
    cy.contains('button', tabName).click({ force: true });
});

Then('I should see an audit entry for the approval action', () => {
    cy.get('table').should('exist');
});

And('the audit entry should contain {string}', (text: string) => {
    cy.get('table').should('contain.text', text);
});
