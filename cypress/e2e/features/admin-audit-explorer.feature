Feature: Admin Audit Explorer
  As an Administrator
  I want to explore and search audit logs
  So that I can monitor system activity and verify security events

  Background:
    Given the application is running
    And I am logged in as an administrator
    And I am on the Admin Settings page
    And I select the "Audit" tab

  Scenario: Viewing the audit log table
    Then I should see a table containing audit log entries
    And each entry should show "Timestamp", "Type", "Actor", and "Action"
    And some entries should be marked as "SIGNED" with a verified shield icon

  Scenario: Searching for a specific audit event
    When I type "PERSONA_SWITCH" into the audit search box
    Then the log table should only show entries related to persona switching
    And the results count should be updated

  Scenario: Filtering logs by type
    When I select "SECURITY" from the log type filter
    Then the log table should only show entries with the "SECURITY" badge
    And entries of type "ACCESS" should be hidden

  Scenario: Viewing detailed audit metadata
    When I click the "View Details" button for a specific audit entry
    Then a dialog should open showing the "Audit Entry Details"
    And I should see the raw JSON metadata for that event
    And I should see the "Verified Cryptographic Signature" status if applicable

  Scenario: Exporting audit logs
    When I click the "Export" button
    Then a file download for "acs_audit_export_" should be initiated
