Feature: Secure Session Management
  As an application utilizing sensitive SSO tokens and Backend Proxies
  I want strict timeout handlers, CSRF mitigations, and explicit logout states
  So that unauthorized use is blocked forcefully across browsers

  Background:
    Given the application is running
    And the BFF server is available at the configured URL

  Scenario Outline: Session validation transitions across lifecycle states
    Given I have a session in state "<initial_state>"
    When the session event "<event>" occurs
    Then the session state should become "<final_state>"
    And the UI should display the notification "<notification>"
    And the system action "<system_action>" should execute

    Examples:
      | initial_state | event                  | final_state | notification                              | system_action              |
      | Active        | Approaching expiry     | Warning     | Session expiration warning                | Show renewal dialog        |
      | Warning       | User clicks Renew      | Active      | Session renewed successfully              | Extend session token       |
      | Active        | Token hard-expires     | Expired     | Your session has expired. Please log in   | Redirect to login page     |
      | Active        | Suspicious activity    | Terminated  | Security violation detected               | Invalidate all sessions    |
      | Active        | User clicks Sign Out   | Ended       | You have been signed out                  | Call /api/auth/logout      |

  Scenario Outline: Concurrent session enforcement
    Given user "<username>" is logged in on a "<primary_browser>" browser
    When a new login for "<username>" occurs from a different device "<secondary_device>"
    Then the session count should be evaluated
    And if the limit of "<session_limit>" is exceeded, the oldest session should be terminated
    And "<primary_browser>" should receive a logout signal on next poll

    Examples:
      | username | primary_browser | secondary_device | session_limit |
      | Alice    | Chrome          | Firefox Mobile   | 3             |
      | Bob      | Firefox         | Safari on iPad   | 3             |

  Scenario Outline: Automatic logout on token expiry by time limit
    When I simulate a session cookie that has passed the "<expiry_limit>" token limit
    And a backend poll is triggered against the "/api/session/check" endpoint
    Then the BFF server should respond with "<response_code>"
    And the Session Manager should purge all local tokens
    And the user should be redirected to "<redirect_page>"
    And a toast notification "<toast_message>" should appear

    Examples:
      | expiry_limit  | response_code | redirect_page | toast_message                           |
      | 15-minute     | 401           | /login        | Session expired. Please log in again.   |
      | 8-hour        | 401           | /login        | Session expired. Please log in again.   |

  Scenario Outline: Session token refresh with BFF
    Given the BFF is configured with provider "<provider>"
    When a valid session is within the pre-expiry buffer window
    And the refresh endpoint "/api/auth/refresh" is called
    Then the BFF should issue a renewed "<token_type>" with extended expiry
    And the frontend should silently update without user disruption

    Examples:
      | provider  | token_type |
      | Google    | bff_jwt    |
      | Microsoft | bff_jwt    |
      | Okta      | bff_jwt    |
