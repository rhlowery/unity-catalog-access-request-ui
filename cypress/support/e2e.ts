// Import commands.js using ES2015 syntax:
import './commands'

// require('./commands')

Cypress.on('uncaught:exception', (err, runnable) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  // return false to prevent Cypress from failing the test immediately if needed, 
  // but we want it to fail WITH the message so we'll throw it or let it fail.
  return true;
});
