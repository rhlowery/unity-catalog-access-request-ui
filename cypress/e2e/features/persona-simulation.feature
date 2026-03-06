@persona-test @simulation
Feature: Persona Simulation and Access Control
  As an administrator
  I want to switch between different personas
  So that I can verify that each role has the correct level of access to data objects and features

  Background: Configure Identity Provider
    Given the identity provider "Mock" is configured
    And I am on the login page

  @persona-validation
  Scenario Outline: Access permissions for specific personas
    When I click the "Mock" login button
    And I select the mock user with role "<role>"
    Then I should be redirected to the main dashboard
    And I should see the persona label "<persona_label>"
    And I should see the "<tab_name>" tab

    Examples:
      | role             | persona_label  | tab_name        |
      | USER             | USER           | Current Access  |
      | APPROVER         | APPROVER       | Approver        |
      | ACCESS_AUDITOR   | ACCESS AUDITOR | Audit Log       |
      | SECURITY_ADMIN   | SECURITY ADMIN | Data Approvers  |
      | PLATFORM_ADMIN   | PLATFORM ADMIN | Users & Groups  |

  @emergency-access
  Scenario: Emergency Access elevation
    When I select the mock user with role "PLATFORM_ADMIN"
    Then I should be redirected to the main dashboard
    And the Simulation banner should be visible
    And all governance tabs should be unlocked
