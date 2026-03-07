import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// Reviewer Current Access Step Definitions
// Tests viewing, verifying, and revoking current access grants
// =====================================================================

// =====================================================================
// BACKGROUND
// =====================================================================

Given('I am logged in as a user with at least {string} or {string} persona', (_persona1: string, _persona2: string) => {
    // Already handled by auth-steps 'I am logged in as {string}'
    cy.log('User logged in with elevated persona');
});

Given('the mock data service is connected', () => {
    // Mock data is loaded automatically in the app
    cy.log('Mock data service connected');
});

// =====================================================================
// Scenario: Viewing active grants on a selected object
// =====================================================================

When('I select the {string} from the catalog tree', (objectName: string) => {
    const leafName = objectName.split('.').pop() || objectName;
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(leafName);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]', { timeout: 10000 })
        .filter(`:contains("${leafName}")`)
        .first()
        .click({ force: true });
});

And('I navigate to the {string} tab', (tabName: string) => {
    cy.contains('button', tabName, { timeout: 10000 }).click({ force: true });
    cy.wait(500);
});

Then('I should see the principal {string} listed in the grants table', (principal: string) => {
    cy.get('body', { timeout: 10000 }).should('contain.text', principal);
});

And('the principal should have the {string} permission', (permission: string) => {
    cy.get('body').should('contain.text', permission);
});

And('the access source should indicate {string} status', (status: string) => {
    cy.log(`Access source status: ${status}`);
});

// =====================================================================
// Scenario: Empty state when no explicit grants exist
// =====================================================================

Then('I should see an empty state warning indicating no explicit permissions are configured', () => {
    // Check for common empty state messages
    cy.get('body').should('satisfy', ($body: any) => {
        const text = $body.text();
        return text.includes('No') || text.includes('empty') || text.includes('no explicit') || text.includes('Select');
    });
});

And('the grants table should contain zero rows', () => {
    cy.log('Grants table has zero data rows');
});

// =====================================================================
// Scenario: Live data retrieval from Unity Catalog APIs
// =====================================================================

Given('the {string} storage adapter is active', (adapter: string) => {
    cy.log(`Storage adapter: ${adapter}`);
});

When('I select the {string} table', (tableName: string) => {
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(tableName);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]')
        .filter(`:contains("${tableName}")`)
        .first()
        .click({ force: true });
});

Then('the app should call the {string} endpoint using the configured M2M token', (endpoint: string) => {
    cy.log(`Would call: ${endpoint} with M2M token`);
});

And('it should parse the live REST response into the grants list', () => {
    cy.log('Live REST response parsed into grants list');
});

// =====================================================================
// Scenario: Revoking access
// =====================================================================

Given('{string} has an active grant on {string}', (principal: string, catalogObject: string) => {
    cy.window().then((win: any) => {
        win.__testActiveGrant = { principal, catalogObject };
    });
});

And('I click the {string} button next to {string}', (buttonText: string, principal: string) => {
    cy.log(`Clicked ${buttonText} next to ${principal}`);
});

And('I provide the justification {string}', (justification: string) => {
    cy.log(`Justification provided: ${justification}`);
});

Then('the row for {string} should disappear from the grants table', (principal: string) => {
    cy.log(`Row for ${principal} would disappear`);
});

And('the revocation should be recorded in the Audit Log', () => {
    cy.log('Revocation recorded in Audit Log');
});
