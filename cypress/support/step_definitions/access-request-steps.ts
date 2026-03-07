import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// CATALOG OBJECT SELECTION
// =====================================================================

Given('I have selected the {string} from the catalog tree', (catalogObject: string) => {
    // Search to surface deeply nested items
    cy.get('input[placeholder*="Search catalog"]', { timeout: 15000 }).should('be.visible').clear().type(catalogObject);
    cy.wait(1000); // Give React state/debounce time to render results

    // Find the row with text, and click the checkbox within it
    cy.contains(catalogObject, { timeout: 10000 }).closest('.TEST-SELECTOR')
        .find('input[type="checkbox"]')
        .first()
        .click({ force: true });
});

Given('I have selected the {string} field is empty', (field: string) => {
    // Ensure form is visible if we are testing a field inside the form
    if (field !== 'catalog object') {
        cy.get('input[placeholder*="Search catalog"]').clear().type('transactions');
        cy.wait(1000);
        cy.contains('transactions').closest('.group')
            .find('input[type="checkbox"]')
            .first()
            .click({ force: true });
    }

    // Setup for missing fields
    if (field === 'catalog object') {
        cy.get('body').then($body => {
            const clearBtns = $body.find('button[aria-label="Clear Selection"], button[title*="Clear"]');
            if (clearBtns.length > 0) {
                cy.wrap(clearBtns).click({ force: true, multiple: true });
            }
        });
    } else if (field === 'principal') {
        // Justification and permission are already set if needed, or we just Ensure they are set
        cy.contains('button', 'SELECT').click({ force: true });
        cy.get('textarea[placeholder*="justification"]').clear().type('Justification text');
    } else if (field === 'permission type') {
        cy.get('input[placeholder*="Filter idents"]').clear().type('Finance');
        cy.contains('Finance Admins').click({ force: true });
        cy.get('textarea[placeholder*="justification"]').clear().type('Justification text');
    } else if (field === 'business justification') {
        cy.get('input[placeholder*="Filter idents"]').clear().type('Finance');
        cy.contains('Finance Admins').click({ force: true });
        cy.contains('button', 'SELECT').click({ force: true });
        cy.get('textarea[placeholder*="justification"]').clear();
    }
});

// =====================================================================
// FORM SUBMISSION & VALIDATION
// =====================================================================

When('I click the Submit Request button', () => {
    cy.get('button').filter(':contains("Submit Request")').first().click({ force: true });
});

Then('I should see a validation warning about {string}', (field: string) => {
    if (field === 'catalog object') {
        cy.get('body').should('contain.text', 'SELECT OBJECTS FROM THE CATALOG');
    } else if (field === 'principal') {
        cy.contains('Please select at least one principal').should('be.visible');
    } else if (field === 'permission type') {
        cy.contains('Please select at least one permission').should('be.visible');
    } else if (field === 'business justification') {
        cy.contains('Please provide a business justification').should('be.visible');
    }
});

And('the request should not be submitted', () => {
    cy.get('body', { timeout: 2000 }).should('not.contain.text', 'successfully');
});

// =====================================================================
// PRINCIPAL SELECTION
// =====================================================================

When('I type {string} into the principal search box', (searchTerm: string) => {
    cy.get('input[placeholder*="Filter idents"]', { timeout: 10000 }).should('be.visible').clear().type(searchTerm);
});

Then('the {string} should appear in the combobox dropdown', (principalName: string) => {
    cy.contains(principalName, { timeout: 10000 }).should('be.visible');
});

When('I select the {string}', (principalName: string) => {
    cy.contains(principalName).click({ force: true });
});

When('I select the principal {string}', (principalName: string) => {
    cy.get('input[placeholder*="Filter idents"]').clear().type(principalName);
    cy.contains(principalName).click({ force: true });
});

Given('I have selected the {string} principal', (principalName: string) => {
    cy.get('input[placeholder*="Filter idents"]').clear().type(principalName);
    cy.contains(principalName).click({ force: true });
});

And('I have selected the principal {string}', (principalName: string) => {
    cy.get('input[placeholder*="Filter idents"]').clear().type(principalName);
    cy.contains(principalName).click({ force: true });
});

Then('the selected principal badge should appear showing {string}', (principalName: string) => {
    cy.get('body').should('contain.text', principalName);
});

// =====================================================================
// PERMISSION SELECTION
// =====================================================================

When('I select the {string} permission type', (permission: string) => {
    cy.contains('button', permission).click({ force: true });
});

Given('I have selected the {string} permission type', (permission: string) => {
    cy.contains('button', permission).click({ force: true });
});

Then('the permission badge should update to show {string}', (permission: string) => {
    cy.contains('button', permission).should('be.visible');
});

// =====================================================================
// JUSTIFICATION
// =====================================================================

And('I have entered the business justification {string}', (justif: string) => {
    cy.get('textarea[placeholder*="justification"]').clear().type(justif);
});

// =====================================================================
// SUBMISSION MODAL & TOAST
// =====================================================================

Then('the submission confirmation modal should appear', () => {
    cy.get('body').should('contain.text', 'Confirm');
});

And('after processing, a successful submission toast should appear', () => {
    cy.get('body', { timeout: 15000 }).should('contain.text', 'success');
});

And('the form should reset to its default state', () => {
    cy.get('textarea[placeholder*="justification"]').should('have.value', '');
});

// =====================================================================
// EXPIRATION CONSTRAINTS
// =====================================================================

When('I open the "Expiration Constraints" accordion', () => {
    cy.contains('Expiration Constraints').click({ force: true });
});

And('I toggle the "Set expiration date or time limit" switch', () => {
    cy.get('button[role="switch"], input[type="checkbox"]').first().click({ force: true });
});

And('I choose a {string} hour duration limit', (duration: string) => {
    cy.get('button[role="combobox"]').first().click({ force: true });
    cy.contains('[role="option"]', duration).click({ force: true });
});

And('I submit the valid access request', () => {
    cy.get('button').contains('Submit Request').click({ force: true });
});

Then('the pending request payload should include the duration limit of {string} hours', (duration: string) => {
    cy.get('body').should('contain.text', 'success');
});

And('the form should allow request submission', () => {
    cy.get('button').contains('Submit Request').should('not.be.disabled');
});
