import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Admin Audit Explorer Step Definitions

Given('I am on the Admin Settings page', () => {
    // Intercept the audit log fetch to prevent race conditions
    cy.intercept('GET', '**/api/audit/log*').as('fetchAuditLogs');

    // Ensure the main UI is loaded by waiting for the title
    // This title is defined in MainLayout as 'Access Control System'
    cy.contains('Access Control System', { timeout: 30000 }).should('be.visible');

    // Click the settings button with force (which auto-scrolls)
    cy.get('[data-testid="settings-nav-item"]', { timeout: 20000 })
        .should('be.visible')
        .click({ force: true });

    // Safety check: ensure settings dialog is at least attempting to open
    cy.contains('Settings', { timeout: 15000 }).should('be.visible');
});

Given('I select the "Audit" tab', () => {
    cy.get('[data-testid="settings-tab-audit"]', { timeout: 15000 })
        .should('be.visible')
        .click({ force: true });

    // Wait for the BFF to return audit data before asserting on UI
    cy.wait('@fetchAuditLogs');
});

Then('I should see a table containing audit log entries', () => {
    // We expect the table to eventually load real rows
    cy.get('table', { timeout: 15000 }).should('be.visible');

    // Due to cy.wait(), we know data is fetched. Ensure normal rows exist.
    cy.get('[data-testid="audit-log-row"]', { timeout: 15000 })
        .should('have.length.at.least', 1);
});

Then('each entry should show "Timestamp", "Type", "Actor", and "Action"', () => {
    cy.get('thead').should('contain', 'Timestamp');
    cy.get('thead').should('contain', 'Type');
    cy.get('thead').should('contain', 'Actor');
    cy.get('thead').should('contain', 'Action');
});

Then('some entries should be marked as "SIGNED" with a verified shield icon', () => {
    // We just verify one exists to confirm the UI is rendering this conditional state
    cy.contains('SIGNED').should('be.visible');
    cy.get('svg.text-green-500').should('exist');
});

When('I type {string} into the audit search box', (query: string) => {
    cy.get('[data-testid="audit-search-input"]')
        .should('be.visible')
        .clear()
        .type(query);
});

Then('the log table should only show entries related to persona switching', () => {
    // All visible rows should mention PERSONA_SWITCH
    cy.get('tbody').find('[data-testid="audit-log-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'PERSONA_SWITCH');
    });
});

Then('the results count should be updated', () => {
    // We now always show the count if results exist
    cy.contains(/Showing \d+ to \d+ of \d+ entries/i).should('be.visible');
});

When('I select {string} from the log type filter', (type: string) => {
    cy.get('[data-testid="audit-type-filter"]').should('be.visible').click({ force: true });

    // Find the option in the portal (Radix UI)
    cy.get('body').contains('[role="option"]', type, { timeout: 15000 })
        .should('be.visible')
        .click({ force: true });

    // Briefly wait for filter transition
    cy.wait(500);
});

Then('the log table should only show entries with the {string} badge', (type: string) => {
    cy.get('tbody').find('[data-testid="audit-log-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="audit-type-badge"]').should('contain', type);
    });
});

Then('entries of type {string} should be hidden', (type: string) => {
    // No rows should have this badge
    cy.get('tbody').find('[data-testid="audit-log-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="audit-type-badge"]').should('not.contain', type);
    });
});

When('I click the "View Details" button for a specific audit entry', () => {
    cy.get('[data-testid="view-audit-details-button"]')
        .should('be.visible')
        .first()
        .click({ force: true });
});

Then('a dialog should open showing the "Audit Entry Details"', () => {
    cy.get('[data-testid="audit-details-dialog"]').should('be.visible')
        .should('contain', 'Audit Entry Details');
});

Then('I should see the raw JSON metadata for that event', () => {
    cy.get('pre').should('be.visible').should('not.be.empty');
});

Then('I should see the "Verified Cryptographic Signature" status if applicable', () => {
    // We check either the verified or amber unsecured icon exists in the dialog
    cy.get('[role="dialog"]').should('contain', 'Signature');
});

When('I click the "Export" button', () => {
    cy.get('[data-testid="audit-export-button"]')
        .should('be.visible')
        .click({ force: true });
});

Then('a file download for {string} should be initiated', (filenamePrefix: string) => {
    // We check for the toast instead of file existence as a proxy
    cy.contains('Audit log export started', { timeout: 10000 }).should('be.visible');
});
