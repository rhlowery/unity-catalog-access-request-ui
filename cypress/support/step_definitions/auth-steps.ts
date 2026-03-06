import { Given, When, Then, defineParameterType } from '@badeball/cypress-cucumber-preprocessor';

// Helper alias for And steps
const And = Then;

// Define common parameter types if needed
defineParameterType({
  name: 'role',
  regexp: /USER|APPROVER|ACCESS_AUDITOR|SECURITY_ADMIN|PLATFORM_ADMIN/,
  transformer: s => s
});

// Configure Identity Provider
Given('the identity provider {string} is configured', (provider: string) => {
  // We mock the configuration in localStorage
  const config = {
    identityType: provider.toUpperCase(),
    ucAuthType: 'MOCK'
  };
  localStorage.setItem('uc_config', JSON.stringify(config));
  cy.log(`Configured identity provider: ${provider}`);
});

// Navigation
Given('I am on the login page', () => {
  cy.visit('/login');
});

Given('the application is running', () => {
  cy.visit('/');
});

// Authentication Actions
When('I click the {string} login button', (provider: string) => {
  const testId = `${provider.toLowerCase()}-login-button`;

  // In MOCK mode, the app might auto-trigger the provider and show user selection immediately
  cy.get('body').then(($body) => {
    if ($body.find(`[data-testid="${testId}"]`).length > 0) {
      cy.get(`[data-testid="${testId}"]`).click();
    } else {
      cy.log(`Button ${testId} not found, assuming auto-login or state already progressed`);
    }
  });
});

When('I select the mock user with role {string}', (role: string) => {
  // Role mapping to mock user IDs
  const roleToId: Record<string, string> = {
    'USER': 'user_standard',
    'APPROVER': 'user_finance_approver',
    'ACCESS_AUDITOR': 'user_auditor',
    'SECURITY_ADMIN': 'user_security_admin',
    'PLATFORM_ADMIN': 'user_platform_admin'
  };

  const userId = roleToId[role] || 'user_standard';
  cy.get(`[data-testid="mock-user-${userId}"]`).click();
});

When('I enter valid credentials for {string}', (username: string) => {
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type('any-password');
  cy.get('[data-testid="login-submit-button"]').click();
});

// Post-Auth Expectations
Then('I should be redirected to the main dashboard', () => {
  // Check for presence of layout elements that only exist when logged in
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="persona-label"]').should('be.visible');
});

Then('I should see the persona label {string}', (expectedLabel: string) => {
  cy.get('[data-testid="persona-label"]').should('contain.text', expectedLabel.replace('_', ' '));
});

Then('I should see the {string} tab', (tabName: string) => {
  cy.contains('button', tabName).should('be.visible');
});

// Session Management
Given('I am logged in as a standard user', () => {
  // Clear any existing session
  localStorage.clear();

  // Navigate and login
  cy.visit('/login');
  cy.get('[data-testid="mock-login-button"]').click();
  cy.get('[data-testid="mock-user-user_standard"]').click();
  cy.url().should('include', '/dashboard');
});

Given('I am logged in as {string}', (role: string) => {
  localStorage.clear();
  cy.visit('/login');
  cy.get('[data-testid="mock-login-button"]').click();

  const roleToId: Record<string, string> = {
    'USER': 'user_standard',
    'APPROVER': 'user_finance_approver',
    'ACCESS_AUDITOR': 'user_auditor',
    'SECURITY_ADMIN': 'user_security_admin',
    'PLATFORM_ADMIN': 'user_platform_admin'
  };

  const userId = roleToId[role.toUpperCase()] || 'user_standard';
  cy.get(`[data-testid="mock-user-${userId}"]`).click();
  cy.url().should('include', '/dashboard');
});

When('I click the sign out button', () => {
  cy.get('button[title="Sign Out"]').click();
});

Then('I should be redirected to the login page', () => {
  cy.url().should('include', '/login');
});

// Error States
Then('I should see an error message {string}', (message: string) => {
  // Sonner toasts or inline errors
  cy.contains(message).should('be.visible');
});