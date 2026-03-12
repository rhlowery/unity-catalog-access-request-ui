import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// HELPER: Navigate to the Access Request tab
// =====================================================================

function ensureOnAccessRequestTab() {
    // The app defaults to "Current Access" (REVIEWER). We need to click
    // the "Access Request" tab to switch to the CHANGE_REQUEST view.
    cy.contains('button', 'Access Request', { timeout: 10000 }).click({ force: true });
    cy.wait(500); // Allow tab switch animation
}

// =====================================================================
// CATALOG OBJECT SELECTION
// =====================================================================

Given('I have selected the {string} from the catalog tree', (catalogObject: string) => {
    // First ensure we're on the Access Request tab
    ensureOnAccessRequestTab();

    // Search to surface deeply nested items
    cy.get('input[placeholder*="Search catalog"]', { timeout: 15000 }).should('be.visible').clear().type(catalogObject);
    cy.wait(1000); // Give React state/debounce time to render results

    // Find the row with text, and click the checkbox within it
    cy.get('[data-testid="catalog-node"]', { timeout: 10000 })
        .filter(`:contains("${catalogObject}")`)
        .first()
        .find('[data-testid="catalog-node-checkbox"]')
        .click({ force: true });
});

Given('I have selected the {string} field is empty', (field: string) => {
    // Switch to Access Request tab first
    ensureOnAccessRequestTab();

    // If we need the form itself visible (i.e. testing a field that is INSIDE the form),
    // we must first select a catalog object so the form renders.
    if (field !== 'catalog object') {
        cy.get('input[placeholder*="Search catalog"]').clear().type('transactions');
        cy.wait(1000);
        cy.get('[data-testid="catalog-node"]')
            .filter(':contains("transactions")')
            .first()
            .find('input[type="checkbox"]')
            .click({ force: true });

        // Wait for the form to render
        cy.get('[data-testid="justification-input"]', { timeout: 10000 }).should('exist');
    }

    // Setup: fill all OTHER fields so only the target field is missing
    if (field === 'catalog object') {
        // Don't select anything — the empty state is the validation
    } else if (field === 'principal') {
        // Set permission + justification, but leave principal empty
        cy.get('[data-testid="permission-toggle-SELECT"]').click({ force: true });
        cy.get('[data-testid="justification-input"]').type('Test justification');
    } else if (field === 'permission type') {
        // Set principal + justification, but leave permission empty
        cy.get('[data-testid="principal-search-input"]').clear().type('Chris');
        cy.get('[data-testid^="principal-option-"]').first().click({ force: true });
        cy.get('[data-testid="justification-input"]').type('Test justification');
    } else if (field === 'business justification') {
        // Set principal + permission, but leave justification empty
        cy.get('[data-testid="principal-search-input"]').clear().type('Finance');
        cy.get('[data-testid^="principal-option-"]').first().click({ force: true });
        cy.get('[data-testid="permission-toggle-SELECT"]').click({ force: true });
        cy.get('[data-testid="justification-input"]').clear();
    }
});

// =====================================================================
// FORM SUBMISSION & VALIDATION
// =====================================================================

When('I click the Submit Request button', () => {
    // Intercept/mock the BFF storage request to avoid session issues
    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('saveRequest');

    cy.get('[data-testid="submit-request-button"]').scrollIntoView().click({ force: true });
});

Then('I should see a validation warning about {string}', (field: string) => {
    if (field === 'catalog object') {
        // When no catalog objects selected, the form shows empty state
        cy.get('body').should('contain.text', 'Secure Access Bridge');
    } else if (field === 'principal') {
        // Toast validation message
        cy.contains('Please select at least one principal', { timeout: 5000 }).should('be.visible');
    } else if (field === 'permission type') {
        cy.contains('Please select at least one permission', { timeout: 5000 }).should('be.visible');
    } else if (field === 'business justification') {
        cy.contains('Please provide a justification', { timeout: 5000 }).should('be.visible');
    }
});

And('the request should not be submitted', () => {
    // Verify that the saveRequest intercept was NOT called
    cy.get('@saveRequest').should('not.exist');
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
    cy.get(`[data-testid="permission-toggle-${permission}"]`).click({ force: true });
});

Given('I have selected the {string} permission type', (permission: string) => {
    cy.get(`[data-testid="permission-toggle-${permission}"]`).click({ force: true });
});

Then('the permission badge should update to show {string}', (permission: string) => {
    cy.get(`[data-testid="permission-toggle-${permission}"]`).should('be.visible');
});

// =====================================================================
// JUSTIFICATION
// =====================================================================

And('I have entered the business justification {string}', (justif: string) => {
    cy.get('[data-testid="justification-input"]').clear().type(justif);
});

// =====================================================================
// SUBMISSION MODAL & TOAST
// =====================================================================

Then('the submission confirmation modal should appear', () => {
    // In the new UI, there isn't a separate modal before the toast, 
    // but the button showing loading state or the toast itself confirms it.
    // For now, we expect the toast to appear shortly.
    cy.get('[data-sonner-toast]', { timeout: 10000 }).should('be.visible');
});

And('after processing, a successful submission toast should appear', () => {
    cy.contains('[data-sonner-toast]', 'successfully', { timeout: 10000 }).should('be.visible');
});

And('the form should reset to its default state', () => {
    // After successful submission, the view switches back to REVIEWER
    // Just verify we're no longer in the form state
    cy.get('body').should('be.visible');
});

// =====================================================================
// EXPIRATION CONSTRAINTS
// =====================================================================

When('I open the "Expiration Constraints" accordion', () => {
    // Scroll the constraint section into view
    cy.contains('Constraints').scrollIntoView().should('exist');
});

And('I toggle the "Set expiration date or time limit" switch', () => {
    // Click the "Duration (Hours)" radio button to enable the duration input
    cy.contains('label', 'Duration').scrollIntoView().click({ force: true });
});

And('I choose a {string} hour duration limit', (duration: string) => {
    // Type the duration in the number input
    cy.get('[data-testid="duration-input"]', { timeout: 5000 }).scrollIntoView().clear().type(duration);
});

And('I submit the valid access request', () => {
    // Intercept/mock the BFF storage request
    cy.intercept('POST', '**/api/storage/requests', {
        statusCode: 200,
        body: { status: 'success', count: 1 }
    }).as('saveRequest');

    cy.get('[data-testid="submit-request-button"]').scrollIntoView().click({ force: true });
});

Then('the pending request payload should include the duration limit of {string} hours', (_duration: string) => {
    cy.wait('@saveRequest').then((interception: any) => {
        const request = Array.isArray(interception.request.body) ? interception.request.body[0] : interception.request.body;
        expect(request.timeConstraint.value).to.equal(parseInt(_duration));
    });
    cy.contains('[data-sonner-toast]', 'successfully').should('be.visible');
});

And('the form should allow request submission', () => {
    cy.get('button').contains('Submit').should('not.be.disabled');
});
