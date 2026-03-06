@auth
Feature: Authentication and Session Lifecycle
  As a security-focused application
  I want to ensure robust authentication and basic session lifecycle management
  So that user identities are protected and resources are accessed securely

  Scenario Outline: Successful user authentication via different providers
    Given I am on the login page
    When I click the "<login_provider>" login button
    And I select the mock user with role "<role>"
    Then I should be redirected to the main dashboard
    And I should see the persona label "<persona_label>"

    Examples:
      | login_provider | role            | persona_label  |
      | Mock           | USER            | USER           |
      | Mock           | PLATFORM_ADMIN  | PLATFORM ADMIN |

  @logout
  Scenario: User logout
    Given I am logged in as a standard user
    When I click the sign out button
    Then I should be redirected to the login page

  @identity-resolution
  Scenario Outline: Identity resolution for configured provider
    Given the identity provider "<provider>" is configured
    And I am on the login page
    When I click the "Mock" login button
    And I select the mock user with role "<role>"
    Then I should be redirected to the main dashboard
    And I should see the persona label "<persona_label>"

    Examples:
      | provider | role           | persona_label  |
      | Mock     | SECURITY_ADMIN | SECURITY ADMIN |
      | Mock     | ACCESS_AUDITOR | ACCESS AUDITOR |