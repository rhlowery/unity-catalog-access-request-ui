import { Given } from '@badeball/cypress-cucumber-preprocessor';

Given('the application is running', () => {
    cy.visit('/');
});

Given('I am logged in as a standard user', () => {
    cy.window().then((win: any) => {
        win.localStorage.setItem('acs_config', JSON.stringify({
            persona: 'Data Consumer'
        }));
    });
});
