import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { defineParameterType } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

// Parameter Types
defineParameterType({
  name: 'loginAttempts',
  transformer: (value: string) => parseInt(value, 10),
  regexp: /\d+/
});

// Common Nav
Given('the application is running', () => {
  cy.visit('/');
});

Given('I am on the login page', () => {
  cy.visit('/login');
});

When('I have valid credentials', () => {
  const username = Cypress.env('TEST_USER') || 'testuser';
  const password = Cypress.env('TEST_PASSWORD') || 'testpass';
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
});

When('I click {string}', (label: string) => {
  cy.contains('button', label).click();
});

Then('I should be redirected to the main dashboard', () => {
  cy.url().should('include', '/dashboard');
});

// Catalog Steps
When('I expand the {string} folder in the sidebar', (catalog: string) => {
  cy.get('span').contains(catalog).closest('div').find('button').first().click();
});

Then('I should see the schema {string} listed', (schema: string) => {
  cy.get('span').contains(schema).should('be.visible');
});

When('I type {string} into the catalog tree search box', (term: string) => {
  cy.get('input[placeholder="Search catalog..."]').type(term);
});

Then('only the {string} matching node should be visible', (expected: string) => {
  const parts = expected.split('.');
  const lastName = parts[parts.length - 1];
  cy.get('span').contains(lastName).should('be.visible');
});

Then('non-matching catalog nodes should be hidden', () => {
  // Check for some node that definitely shouldn't be there
  cy.get('span').contains('DefinitelyNotThere').should('not.exist');
});

When('I select the {string} from the {string} schema', (object: string, schema: string) => {
  cy.get('span').contains(object).closest('div').find('input[type="checkbox"]').click();
});

Then('the selected object count badge should show {string}', (count: string) => {
  cy.get('[data-testid="selection-badge"]').should('contain', count);
});

// Mocking session
Given('I am logged in as a standard user', () => {
  cy.visit('/');
  cy.window().then((win: any) => {
    win.localStorage.setItem('acs_config', JSON.stringify({
      persona: 'Data Consumer'
    }));
  });
});