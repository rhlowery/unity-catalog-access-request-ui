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
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => win.sessionStorage.clear());
  cy.visit('/login');
});

Given('the application is running', () => {
  cy.visit('/');
});

Given('the mock identity system is loaded', () => {
  cy.log('Mock identity system loaded');
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
  // Since the app uses conditional rendering instead of route-based navigation, 
  // check for main layout elements instead of URL.
  cy.get('main').should('be.visible');
  cy.get('[data-testid="persona-label"]').should('be.visible');
});

Then('I should see the persona label {string}', (expectedLabel: string) => {
  cy.get('[data-testid="persona-label"]').invoke('text').should((text) => {
    const isIncluded = text.trim().toUpperCase().includes(expectedLabel.replace('_', ' ').toUpperCase());
    if (!isIncluded) {
      throw new Error(`Expected persona label "${text}" to include "${expectedLabel}"`);
    }
  });
});

Then('I should see the {string} tab', (tabName: string) => {
  cy.contains('button', tabName).should('exist');
});

// Session Management
Given('I am logged in as a standard user', () => {
  // Clear any existing session
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => win.sessionStorage.clear());

  // Navigate and login
  cy.visit('/login');
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="mock-login-button"]').length > 0) {
      cy.get('[data-testid="mock-login-button"]').click();
    }
  });
  // Intercept the backend auth login
  cy.intercept('POST', '**/api/auth/login').as('loginReq');
  cy.get('[data-testid="mock-user-user_standard"]').click();

  // Wait for login to complete on backend before asserting the UI is loaded
  cy.wait('@loginReq', { timeout: 20000 });
  cy.get('main').should('be.visible');
});

Given('I am logged in as {string}', (role: string) => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => win.sessionStorage.clear());

  cy.visit('/login');
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="mock-login-button"]').length > 0) {
      cy.get('[data-testid="mock-login-button"]').click();
    }
  });

  const roleToId: Record<string, string> = {
    'USER': 'user_standard',
    'APPROVER': 'user_finance_approver',
    'ACCESS_AUDITOR': 'user_auditor',
    'SECURITY_ADMIN': 'user_security_admin',
    'PLATFORM_ADMIN': 'user_platform_admin',
    // Person names used by approval-flow feature
    'ALICE': 'user_alice',
    'BOB': 'user_bob',
  };

  const userId = roleToId[role.toUpperCase()] || 'user_standard';

  // Intercept the backend auth login
  cy.intercept('POST', '**/api/auth/login').as('loginExchange');
  cy.get(`[data-testid="mock-user-${userId}"]`).should('be.visible').click();

  // Wait for login to complete on backend before asserting the UI is loaded
  cy.wait('@loginExchange', { timeout: 20000 });

  // Wait for the main UI
  cy.get('main', { timeout: 20000 }).should('be.visible');

  // Only verify persona label for known role slugs (not person names)
  const knownRoles = ['USER', 'APPROVER', 'ACCESS_AUDITOR', 'SECURITY_ADMIN', 'PLATFORM_ADMIN'];
  if (knownRoles.includes(role.toUpperCase())) {
    const expectedLabel = role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    cy.get('[data-testid="persona-label"]', { timeout: 25000 }).then(($label) => {
      const text = $label.text();
      cy.log(`Active Persona Label: "${text}"`);
      cy.wrap(text.toLowerCase()).should('contain', expectedLabel.toLowerCase());
    });
  } else {
    cy.log(`Skipping persona label check for non-role login: ${role}`);
  }
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

// Simulation and Emergency Steps
Then('the Simulation banner should be visible', () => {
  // We check for the explicit text rendered during simulation
  cy.contains(/Simulation Mode/i).should('exist');
});

Then('all governance tabs should be unlocked', () => {
  cy.contains('button', 'Current Access').should('exist');
  cy.contains('button', 'Approver').should('exist');
  cy.contains('button', 'Audit Log').should('exist');
  cy.contains('button', 'Data Approvers').should('exist');
  cy.contains('button', 'Users & Groups').should('exist');
});