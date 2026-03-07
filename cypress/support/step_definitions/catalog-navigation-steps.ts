import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const And = Then;

Given('I see the {string} in the catalog tree', (name: string) => {
    cy.get('body', { timeout: 15000 }).should('contain.text', name);
});

When('I expand the {string} node', (name: string) => {
    cy.contains(name, { timeout: 10000 }).closest('.group').find('button').click({ force: true });
});

Then('I should see the {string} schema', (name: string) => {
    cy.contains(name, { timeout: 10000, matchCase: false }).should('be.visible');
});

And('I should see the {string} catalog', (name: string) => {
    cy.contains(name, { timeout: 10000, matchCase: false }).should('be.visible');
});

And('I should see the {string} table', (name: string) => {
    cy.contains(name, { timeout: 10000, matchCase: false }).should('be.visible');
});

When('I select the {string} in the catalog tree', (name: string) => {
    cy.contains(name, { timeout: 10000 }).click({ force: true });
});

When('I search for {string} in the catalog search box', (query: string) => {
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(query);
    cy.wait(1000);
});

Then('the catalog tree should filter to show {string}', (name: string) => {
    cy.contains(name, { timeout: 10000 }).should('be.visible');
});

When('I clear the catalog search box', () => {
    cy.get('button[aria-label*="Clear"], button[title*="Clear"]').click({ force: true, multiple: true });
});

And('the full catalog hierarchy should be restored', () => {
    cy.contains('main_catalog').should('be.visible');
});

When('I toggle selection for {string}', (name: string) => {
    cy.contains(name).closest('.group').find('input[type="checkbox"]').first().click({ force: true });
});

Then('the {string} should be marked as selected', (name: string) => {
    cy.contains(name).closest('.group').find('input[type="checkbox"]').should('be.checked');
});
