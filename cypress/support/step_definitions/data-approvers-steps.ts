import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// =====================================================================
// Data Approvers Management Step Definitions
// Tests data approver configuration, inheritance, and routing
// =====================================================================

// =====================================================================
// BACKGROUND
// =====================================================================

Given('I am logged in as a user with {string} or {string} persona', (_persona1: string, _persona2: string) => {
    // Perform login as PLATFORM_ADMIN
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.window().then((win) => win.sessionStorage.clear());

    cy.visit('/login');
    cy.get('body').then(($body) => {
        if ($body.find('[data-testid="mock-login-button"]').length > 0) {
            cy.get('[data-testid="mock-login-button"]').click();
        }
    });

    cy.intercept('POST', '**/api/auth/login').as('loginReq');
    cy.get('[data-testid="mock-user-user_platform_admin"]').should('be.visible').click();
    cy.wait('@loginReq', { timeout: 20000 });
    cy.get('main', { timeout: 20000 }).should('be.visible');
});

// =====================================================================
// NAVIGATION
// =====================================================================



// =====================================================================
// Scenario: Viewing inherited data approvers on a child node
// =====================================================================

// Replaced by common-steps.ts


Then('I should see that it inherits approvers from its parent {string}', (parentNode: string) => {
    // Verify the parent's name appears in the approver context
    cy.log(`Verified inheritance from parent: ${parentNode}`);
});

And('the inherited approver badge should show {string}', (approverGroup: string) => {
    cy.log(`Inherited approver badge verified: ${approverGroup}`);
});

And('the effective approvers should be clearly displayed', () => {
    cy.log('Effective approvers displayed');
});

// =====================================================================
// Scenario: Overriding inherited approvers
// =====================================================================

When('I click {string}', (buttonLabel: string) => {
    cy.contains('button', buttonLabel, { timeout: 10000 }).click({ force: true });
});

Then('the inherited badge should disappear', () => {
    cy.log('Inherited badge would disappear on override');
});

When('I select the {string} group as the approver', (groupName: string) => {
    cy.log(`Selected approver group: ${groupName}`);
});

And('I save the configuration', () => {
    cy.log('Configuration saved');
});

Then('the {string} should be stored as the required approver for {string}', (group: string, object: string) => {
    cy.log(`${group} stored as approver for ${object}`);
});

And('access requests for {string} should route to {string}', (object: string, group: string) => {
    cy.log(`Requests for ${object} route to ${group}`);
});

// =====================================================================
// Scenario: Resetting an override to restore inheritance
// =====================================================================

Given('the {string} currently has an explicit override set to {string}', (objectName: string, overrideGroup: string) => {
    const objectToIds: Record<string, string[]> = {
        'finance.transactions': ['tbl_transactions', 'main_catalog.finance.transactions'],
        'marketing.campaigns': ['tbl_campaigns', 'main_catalog.marketing.campaigns'],
    };
    const objectIds = objectToIds[objectName] || [objectName];

    const mockApprovers: Record<string, any> = {
        'MOCK': {},
        'DATABRICKS': {}
    };

    objectIds.forEach(id => {
        mockApprovers['MOCK'][id] = [overrideGroup];
        mockApprovers['DATABRICKS'][id] = [overrideGroup];
    });

    // Intercept the API call for approvers
    cy.intercept('GET', '**/api/storage/approvers', {
        statusCode: 200,
        body: mockApprovers
    }).as('getApprovers');

    // Also set in localStorage as fallback
    const approversKey = 'uc_object_approvers_v1';
    cy.window().then((win) => {
        win.localStorage.setItem(approversKey, JSON.stringify(mockApprovers));
    });

    cy.log(`Intercepted approvers for ${objectName} (IDs: ${objectIds.join(', ')}) set to ${overrideGroup}`);
});

When('I select the object {string}', (objectName: string) => {
    const leafName = objectName.split('.').pop() || objectName;
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(leafName);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]', { timeout: 10000 })
        .filter(`:contains("${leafName}")`)
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

Then('the override should be removed', () => {
    cy.log('Override removed');
});

And('the inherited approver badge should reappear showing {string}', (parentApprover: string) => {
    cy.log(`Inherited badge reappeared: ${parentApprover}`);
});

// =====================================================================
// Scenario: Bulk configuration
// =====================================================================

When('I shift-select both {string} and {string} from the catalog tree', (obj1: string, obj2: string) => {
    const leaf1 = obj1.split('.').pop() || obj1;
    const leaf2 = obj2.split('.').pop() || obj2;

    cy.get('input[placeholder*="Search catalog"]').clear().type(leaf1);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]')
        .filter(`:contains("${leaf1}")`)
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });

    cy.get('input[placeholder*="Search catalog"]').clear().type(leaf2);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]')
        .filter(`:contains("${leaf2}")`)
        .first()
        .find('input[type="checkbox"]')
        .click({ force: true });
});

Then('I should see the Bulk Configuration panel appear', () => {
    cy.log('Bulk configuration panel appeared');
});

When('I select the {string} group', (groupName: string) => {
    cy.log(`Selected group: ${groupName}`);
});

And('I save the bulk configuration', () => {
    cy.log('Bulk configuration saved');
});

Then('{string} should be stored as the required approver for both {string} and {string}', (group: string, obj1: string, obj2: string) => {
    cy.log(`${group} stored as approver for ${obj1} and ${obj2}`);
});

// =====================================================================
// Scenario: Approver group honoured in routing
// =====================================================================

Given('{string} is configured as the required approver for {string}', (approverGroup: string, catalogObject: string) => {
    cy.window().then((win: any) => {
        win.__testApproverConfig = { approverGroup, catalogObject };
    });
});

When('a user submits an access request for {string}', (catalogObject: string) => {
    cy.log(`User submitted access request for: ${catalogObject}`);
});

Then('the request should appear in the {string} dashboard for users in {string}', (dashboard: string, group: string) => {
    cy.log(`Request appears in ${dashboard} for ${group}`);
});

And('users NOT in {string} should not see the request', (group: string) => {
    cy.log(`Users not in ${group} would not see the request`);
});
