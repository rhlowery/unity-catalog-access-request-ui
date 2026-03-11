import { When } from '@badeball/cypress-cucumber-preprocessor';

When('I navigate to the {string} tab', (tabName: string) => {
    cy.contains('button', tabName, { timeout: 10000 }).click({ force: true });
    cy.wait(500);
});

When('I select the {string} from the catalog tree', (objectName: string) => {
    const leafName = objectName.split('.').pop() || objectName;
    cy.get('input[placeholder*="Search catalog"]', { timeout: 10000 }).clear().type(leafName);
    cy.wait(500);
    cy.get('[data-testid="catalog-node"]', { timeout: 10000 })
        .filter(`:contains("${leafName}")`)
        .first()
        .click({ force: true });
});
