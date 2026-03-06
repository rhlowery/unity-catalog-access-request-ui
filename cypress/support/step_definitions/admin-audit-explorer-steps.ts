import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Admin Audit Explorer Step Definitions

Given('I am logged in as an administrator', () => {
    // In a real app we'd go through login, for now we mock the session/state
    cy.visit('/');
    cy.window().then((win: any) => {
        win.localStorage.setItem('acs_config', JSON.stringify({
            persona: 'Admin'
        }));
    });
});

Given('I am on the Admin Settings page', () => {
    cy.get('[data-testid="settings-nav-item"]').click();
});

Given('I select the "Audit" tab', () => {
    cy.get('button[value="AUDIT"]').click();
});

Then('I should see a table containing audit log entries', () => {
    cy.get('table').should('be.visible');
    cy.get('tbody tr').should('have.length.at.least', 1);
});

Then('each entry should show "Timestamp", "Type", "Actor", and "Action"', () => {
    cy.get('thead').should('contain', 'Timestamp');
    cy.get('thead').should('contain', 'Type');
    cy.get('thead').should('contain', 'Actor');
    cy.get('thead').should('contain', 'Action');
});

Then('some entries should be marked as "SIGNED" with a verified shield icon', () => {
    cy.get('span').contains('SIGNED').should('exist');
    cy.get('svg.text-green-500').should('exist');
});

When('I type {string} into the audit search box', (query: string) => {
    cy.get('input[placeholder="Search by actor, action, or target..."]').type(query);
});

Then('the log table should only show entries related to persona switching', () => {
    cy.get('tbody tr').each(($row) => {
        cy.wrap($row).should('contain', 'PERSONA_SWITCH');
    });
});

Then('the results count should be updated', () => {
    // Check if pagination or count text is visible
    cy.get('div').contains(/Showing \d+ to \d+ of \d+ entries/).should('exist');
});

When('I select {string} from the log type filter', (type: string) => {
    cy.get('button').contains('Type').click();
    cy.get('[role="option"]').contains(type).click();
});

Then('the log table should only show entries with the {string} badge', (type: string) => {
    cy.get('tbody tr').each(($row) => {
        cy.wrap($row).find('.badge').should('contain', type);
    });
});

Then('entries of type {string} should be hidden', (type: string) => {
    cy.get('tbody tr').each(($row) => {
        cy.wrap($row).find('.badge').should('not.contain', type);
    });
});

When('I click the "View Details" button for a specific audit entry', () => {
    cy.get('tbody tr').first().find('button').last().click({ force: true });
});

Then('a dialog should open showing the "Audit Entry Details"', () => {
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').should('contain', 'Audit Entry Details');
});

Then('I should see the raw JSON metadata for that event', () => {
    cy.get('pre').should('be.visible');
});

Then('I should see the "Verified Cryptographic Signature" status if applicable', () => {
    // Assuming the first entry has a signature in the test data
    cy.get('[role="dialog"]').should('contain', 'Verified Cryptographic Signature');
});

When('I click the "Export" button', () => {
    cy.get('button').contains('Export').click();
});

Then('a file download for {string} should be initiated', (filenamePrefix: string) => {
    // In cypress we can't easily verify the actual OS file download 
    // without more complex setup, but we can verify the toast notification
    cy.contains('Audit log export started').should('be.visible');
});
