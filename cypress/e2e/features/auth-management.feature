Feature: Authentication and session Lifecycle
  As a security-focused application
  I want to ensure robust authentication and efficient session lifecycle management
  So that user identities are protected and resources are accessed securely

  Scenario Outline: Successful user authentication via different providers
    Given I am on the login page
    When I click the "<login_provider>" login button
    And I enter valid credentials for "<username>"
    Then I should be redirected to the main dashboard
    And a secure session should be created for "<username>"
    And the session property "<property>" should be valid

    Examples:
      | login_provider | username      | property      |
      | Google         | alice@example | userId        |
      | Microsoft      | bob@example   | expiresAt     |
      | Okta           | carol@example | isActive      |

  Scenario Outline: Session state transitions
    Given I have an active session
    And the session state is "<initial_state>"
    When the specific condition "<condition>" occurs
    Then the session should transition to "<final_state>"
    And I should see the notification "<message>"
    And the expired session should be destroyed if necessary

    Examples:
      | initial_state | condition             | final_state | message                                        |
      | Active        | Approaching Expiry    | Warning     | Session expiration warning                     |
      | Warning       | Renewal Clicked       | Active      | Session renewed successfully                  |
      | Active        | Hard Expiry           | Expired     | Your session has expired                       |
      | Active        | Suspicious Activity   | Terminated  | Security validation failed                    |

  Scenario Outline: Authentication security enforcement
    Given I am attempting to login
    When I trigger the security condition "<condition>"
    Then I should see the error message "<error_message>"
    And the expected system action "<system_action>" should be enforced

    Examples:
      | condition                    | error_message                                   | system_action             |
      | 6 Failed Attempts            | Too many login attempts. Please try again later | Temporary 15-minute lock  |
      | 10 Failed Attempts           | Your account has been suspended                 | Permanent admin lockout   |
      | Max Session Limit Reached (3)| Maximum sessions reached                        | Terminate oldest session  |

  Scenario Outline: Secure identity resolution
    Given the identity provider "<provider>" is configured
    When I resolve the current user identity
    Then it should correctly inherit the groups "<expected_groups>"
    And the simulation mode should be "<simulation_status>"

    Examples:
      | provider    | expected_groups            | simulation_status |
      | Databricks  | admins, users              | Disabled          |
      | Mock        | group_finance_admins, User | Enabled           |