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
  cy.get(`[data-testid="${testId}"]`, { timeout: 10000 }).click();
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
  
  cy.get('body').then(($body) => {
    // If the mock user buttons aren't visible, click the mock login button first
    if ($body.find(`[data-testid="mock-user-${userId}"]`).length === 0) {
      if ($body.find('[data-testid="mock-login-button"]').length > 0) {
        cy.get('[data-testid="mock-login-button"]').click();
        cy.wait(500); // Give it a moment to show users
      }
    }
    cy.get(`[data-testid="mock-user-${userId}"]`, { timeout: 10000 }).click();
  });
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
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => win.sessionStorage.clear());

  // Inject the MOCK user directly to bypass UI login timing issues in Cypress
  const mockUserStr = JSON.stringify({
    id: 'user_alice',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'STANDARD_USER',
    provider: 'mock',
    groups: ['group_all_users']
  });

  const mockConfigStr = JSON.stringify({
    identityType: 'MOCK',
    ucAuthType: 'MOCK'
  });

  // Use onBeforeLoad to ensure localStorage is set BEFORE the app starts
  cy.visit('/', {
    onBeforeLoad: (win) => {
      win.localStorage.setItem('mock_current_user', mockUserStr);
      win.localStorage.setItem('uc_config', mockConfigStr);
    }
  });

  // Wait for the main UI to render
  cy.get('main', { timeout: 30000 }).should('be.visible');
});


Given('I am logged in as {string}', (role: string) => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => win.sessionStorage.clear());

  const roleToId: Record<string, any> = {
    'STANDARD_USER': {
      id: 'user_standard',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'STANDARD_USER',
      groups: ['group_all_users']
    },
    'DATA_APPROVER': {
      id: 'user_approver',
      name: 'Sarah Finance',
      email: 'sarah.f@company.com',
      role: 'APPROVER',
      groups: ['group_all_users', 'group_finance_admins']
    },
    'ACCESS_AUDITOR': {
      id: 'user_auditor',
      name: 'Chris Auditor',
      email: 'chris.a@company.com',
      role: 'ACCESS_AUDITOR',
      groups: ['group_all_users', 'group_auditors']
    },
    'SECURITY_ADMIN': {
      id: 'user_security',
      name: 'Jane Security',
      email: 'jane.s@company.com',
      role: 'SECURITY_ADMIN',
      groups: ['group_all_users', 'group_security']
    },
    'PLATFORM_ADMIN': {
      id: 'user_platform',
      name: 'Pat Platform',
      email: 'pat.p@company.com',
      role: 'PLATFORM_ADMIN',
      groups: ['group_all_users', 'group_platform_admins']
    }
  };

  const userObj = roleToId[role.toUpperCase()] || {
    id: 'user_standard',
    name: 'Alex Analyst',
    email: 'alex.a@company.com',
    role: 'STANDARD_USER',
    groups: ['group_all_users', 'group_finance_analysts']
  };

  const mockUserStr = JSON.stringify({
    ...userObj,
    type: "USER",
    initials: userObj.name.substring(0, 2).toUpperCase(),
    provider: "mock"
  });

  const mockConfigStr = JSON.stringify({
    identityType: 'MOCK',
    ucAuthType: 'MOCK'
  });

  cy.visit('/', {
    onBeforeLoad: (win) => {
      win.localStorage.setItem('mock_current_user', mockUserStr);
      win.localStorage.setItem('uc_config', mockConfigStr);
    }
  });

  // Wait for the main UI
  cy.get('main', { timeout: 30000 }).should('be.visible');

  // Verify label only for system roles
  const knownRoles = ['USER', 'APPROVER', 'ACCESS_AUDITOR', 'SECURITY_ADMIN', 'PLATFORM_ADMIN', 'STANDARD_USER', 'DATA_APPROVER'];
  if (knownRoles.includes(role.toUpperCase())) {
    const displayRole = (role.toUpperCase() === 'DATA_APPROVER' || role.toUpperCase() === 'APPROVER') ? 'APPROVER' : 
                        (role.toUpperCase() === 'STANDARD_USER' || role.toUpperCase() === 'USER') ? 'USER' : 
                        role.toUpperCase().replace('_', ' ');
    
    cy.get('[data-testid="persona-label"]', { timeout: 15000 }).invoke('text').should('match', new RegExp(displayRole, 'i'));
  }
});

When('I click the sign out button', () => {
  cy.get('button[title="Sign Out"]').click();
});

Then('I should be redirected to the login page', () => {
  // The app might use conditional rendering and stay on the same URL after logout,
  // or it might explicitly navigate to /login.
  cy.get('body', { timeout: 15000 }).should(($body) => {
    const hasLoginContent = $body.find('h1:contains("Unity Catalog ACS")').length > 0 || 
                           $body.find('h1:contains("Select User Role")').length > 0 ||
                           $body.find('[data-testid="mock-login-button"]').length > 0;
    
    const isAtLoginUrl = window.location.pathname.includes('/login');
    
    expect(hasLoginContent || isAtLoginUrl, 'Expected to see login content or be at /login URL').to.be.true;
  });
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