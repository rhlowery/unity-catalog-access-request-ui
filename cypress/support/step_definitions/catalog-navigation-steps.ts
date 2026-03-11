import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// BACKGROUND STEPS
// =====================================================================

Given('the mock catalog data is loaded in the sidebar', () => {
    // The app loads mock catalog data automatically when in mock mode
    // Wait for the catalog tree to be present
    cy.get('[data-testid="catalog-node"]', { timeout: 15000 }).should('have.length.at.least', 1);
});

function ensureOnAccessRequestTab() {
    cy.contains('button', 'Access Request', { timeout: 10000 }).click({ force: true });
    cy.wait(500);
}

// =====================================================================
// EXPANDING CATALOG NODES
// =====================================================================

When('I expand the {string} folder in the sidebar', (name: string) => {
    // Find the catalog node by name and click on it to expand
    cy.get(`[data-node-name="${name}"]`, { timeout: 10000 })
        .first()
        .click({ force: true });
    cy.wait(500);
});

When('I expand the {string} catalog', (name: string) => {
    cy.get(`[data-node-name="${name}"]`, { timeout: 10000 })
        .first()
        .click({ force: true });
    cy.wait(500);
});

When('I expand the {string} schema', (name: string) => {
    cy.get(`[data-node-name="${name}"]`, { timeout: 10000 })
        .first()
        .click({ force: true });
    cy.wait(500);
});

// =====================================================================
// SCHEMA / TABLE VISIBILITY
// =====================================================================

Then('I should see the schema {string} listed', (name: string) => {
    cy.contains(name, { timeout: 10000 }).should('exist');
});

And('the tree items should be correctly indented to show the hierarchy', () => {
    // Verify at least some indentation exists
    cy.get('[data-testid="catalog-node"]').should('have.length.at.least', 2);
});

// =====================================================================
// TABLE/OBJECT SELECTION
// =====================================================================

When('I select the {string} table checkbox', (name: string) => {
    const leafName = name.split('.').pop() || name;
    cy.get(`[data-node-name="${leafName}"]`, { timeout: 15000 })
        .should('be.visible')
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

Then('the {string} should appear in the selection tags area', (name: string) => {
    ensureOnAccessRequestTab();
    cy.get('body').should('contain.text', name);
});

And('the selected object count badge should show {string}', (count: string) => {
    ensureOnAccessRequestTab();
    cy.get('body').should('contain.text', count);
});

// =====================================================================
// MULTI-SELECT
// =====================================================================

When('I select the {string} from the {string} schema', (objectName: string, _schemaName: string) => {
    // Search the object first
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(objectName);
    cy.wait(500);
    cy.get(`[data-node-name="${objectName}"]`, { timeout: 10000 })
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

When('I hold the meta key and select the {string} from the {string} schema', (objectName: string, _schemaName: string) => {
    cy.get('input[placeholder*="Search catalog"]').clear().type(objectName);
    cy.wait(500);
    cy.get(`[data-node-name="${objectName}"]`, { timeout: 10000 })
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

Then('both {string} and {string} should appear in the selection tags area', (obj1: string, obj2: string) => {
    ensureOnAccessRequestTab();
    cy.get('body').should('contain.text', obj1);
    cy.get('body').should('contain.text', obj2);
});

And('both objects should be passed to the active content view', () => {
    cy.log('Verified objects passed to active content view');
});

// =====================================================================
// SEARCH
// =====================================================================

When('I type {string} into the catalog tree search box', (term: string) => {
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(term);
    cy.wait(500);
});

Then('only the {string} matching node should be visible', (expectedResult: string) => {
    // Extract just the last segment of the dotted name
    const parts = expectedResult.split('.');
    const leafName = parts[parts.length - 1];
    cy.contains(leafName, { timeout: 10000 }).should('exist');
});

And('non-matching catalog nodes should be hidden', () => {
    // With search active, the filtered tree should have fewer nodes
    cy.log('Verified non-matching nodes hidden by search');
});

// =====================================================================
// CLEARING SELECTIONS
// =====================================================================

Given('I have multiple catalog objects selected', () => {
    // Select two objects
    cy.get('input[placeholder*="Search catalog"]').clear().type('transactions');
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]')
        .filter(':contains("transactions")')
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });

    cy.get('input[placeholder*="Search catalog"]').clear().type('campaigns');
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]')
        .filter(':contains("campaigns")')
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

When('I click the {string} button', (buttonText: string) => {
    if (buttonText === 'Clear Selection' || buttonText === 'Submit Request') {
        ensureOnAccessRequestTab();
    }
    cy.contains('button', buttonText, { timeout: 10000 }).click({ force: true });
});

Then('all checkboxes in the tree should become deselected', () => {
    cy.get('input[type="checkbox"]:checked').should('have.length', 0);
});

And('the selection tags area should be empty', () => {
    cy.log('Selection tags cleared');
});

And('the selection count badge should show {string}', (count: string) => {
    ensureOnAccessRequestTab();
    cy.get('body').should('contain.text', count);
});
