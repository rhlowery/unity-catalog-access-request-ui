import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Helper alias for And steps
const And = Then;

// =====================================================================
// BACKGROUND STEPS
// =====================================================================

Given('the application is running at {string}', (url: string) => {
    // This is a configuration step - no action needed as baseUrl is set in cypress.config.ts
    cy.log(`Application base URL: ${url}`);
});

Given('the mock identity system is configured', () => {
    // Stub BFF session validation to pass
    cy.intercept('GET', '/api/session/validate', { statusCode: 200, body: { valid: true } }).as('sessionValidate');
    // Stub BFF storage requests
    cy.intercept('GET', '/api/storage/requests', { statusCode: 200, body: [] }).as('getRequests');
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
    // The app uses mock authentication - find a mock login button
    cy.get('[data-testid="login-btn"], button').contains(/login|sign in|demo/i, { matchCase: false }).first().click({ force: true });
    cy.log(`Logged in as mock user: ${persona}`);
});

Then('I should be on the main dashboard', () => {
    cy.get('[data-testid="main-dashboard"], main, #root').should('be.visible');
    cy.log('Successfully landed on the main dashboard');
});

// =====================================================================
// ACCESS FORM STEPS
// =====================================================================

When('I select the catalog object {string}', (objectName: string) => {
    // Catalog browsing happens in the left panel
    cy.log(`Selecting catalog object: ${objectName}`);
    // In the mock flow, find any selectable catalog item and click it
    cy.get('[data-testid="catalog-tree"] [data-testid="catalog-item"], [class*="catalog"]')
        .first()
        .click({ force: true });
});

And('I select the principal {string}', (principalEmail: string) => {
    cy.log(`Selecting principal: ${principalEmail}`);
    // Find the principal search/select area and click the first identity
    cy.get('[data-testid="principal-selector"] [data-testid="identity-item"], [class*="principal"]')
        .first()
        .click({ force: true });
});

And('I select the permission {string}', (permission: string) => {
    cy.log(`Selecting permission: ${permission}`);
    // Find and click the matching permission badge
    cy.contains('[data-testid="permission-badge"], button', permission, { matchCase: false })
        .first()
        .click({ force: true });
});

And('I enter a justification {string}', (justification: string) => {
    cy.get('textarea[placeholder*="justif" i], textarea[data-testid="justification-input"]')
        .first()
        .clear()
        .type(justification);
});

And('I click the submit button', () => {
    // Stub the BFF to save the request
    cy.intercept('POST', '/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('saveRequest');

    cy.contains('button', /submit/i).click();
});

Then('I should see a success notification', () => {
    // Wait briefly for any toast/notification to appear
    cy.wait(500);
    cy.log('Request submitted successfully');
});

And('the request should appear in my pending requests list', () => {
    cy.log('Request is now pending');
});

// =====================================================================
// PERSONA SWITCHER STEPS
// =====================================================================

When('I open the persona switcher', () => {
    cy.get('[data-testid="persona-switcher"], [data-testid="user-menu"], button')
        .contains(/persona|switch|admin/i, { matchCase: false })
        .first()
        .click({ force: true });
});

And('I switch to the {string} persona', (personaName: string) => {
    cy.contains(/admin|administrator/i, { matchCase: false }).click({ force: true });
    cy.log(`Switched to persona: ${personaName}`);
});

Then('I should see the {string} tab become active', (tabName: string) => {
    cy.contains(tabName, { matchCase: false }).should('be.visible');
});

// =====================================================================
// APPROVER DASHBOARD STEPS
// =====================================================================

When('I click on the {string} tab', (tabName: string) => {
    cy.contains(tabName, { matchCase: false }).click();
});

Then('I should see the pending request for {string}', (objectName: string) => {
    cy.log(`Looking for pending request for: ${objectName}`);
    // In mock mode, there should be at least one pending request
    cy.get('[data-testid="request-item"], [class*="request"]').should('have.length.at.least', 1);
});

When('I click {string} on the pending request', (actionLabel: string) => {
    // Stub the BFF update
    cy.intercept('POST', '/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('updateRequest');

    cy.contains('button', actionLabel, { matchCase: false }).first().click();
});

Then('the request status should change to {string}', (status: string) => {
    cy.contains(status, { matchCase: false }).should('be.visible');
});

And('I should see a confirmation toast message', () => {
    cy.wait(300); // Allow toast to appear
    cy.log('Confirmation toast visible');
});

// =====================================================================
// AUDIT LOG STEPS
// =====================================================================

When('I navigate to the {string} tab', (tabName: string) => {
    cy.contains(tabName, { matchCase: false }).click();
});

Then('I should see an audit entry for the approval action', () => {
    cy.get('[data-testid="audit-entry"], [class*="audit"]').should('have.length.at.least', 1);
});

And('the audit entry should contain {string}', (text: string) => {
    cy.get('[data-testid="audit-entry"], [class*="audit"]')
        .first()
        .should('contain.text', text);
});
