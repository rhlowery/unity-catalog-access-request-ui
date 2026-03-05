Feature: Persona Simulation and Testing
  As a User Interface Developer or Admin Validator
  I want to switch my apparent identity context transparently
  So that I can test UI reactions, access controls, and policy evaluations locally without hard authentication swaps

  Background:
    Given the application is running
    And the Simulation Mode is enabled in settings
    And the User Dropdown menu in the top right is clickable

  Scenario Outline: Access permissions for specific personas
    When I click the User profile avatar
    And I toggle the "Persona Switcher" 
    And I search for the "<mocked_group>" mocked group
    And I choose the "<persona_profile>" profile
    Then the tabs "<visible_tabs>" should be visible in the header
    And the Settings icon should be "<settings_visibility>" in the footer
    And the simulation should be logged securely

    Examples:
      | mocked_group           | persona_profile | visible_tabs                                                       | settings_visibility |
      | group_platform_admins  | Platform Admin  | Current Access, Access Request, Approver, Data Approvers, Audit Log | visible             |
      | group_security         | Security Admin  | Current Access, Access Request, Data Approvers, Audit Log           | hidden              |
      | group_auditors         | Access Auditor  | Current Access, Access Request, Audit Log                           | hidden              |
      | group_finance_admins   | Approver        | Current Access, Access Request, Approver                            | hidden              |
      | group_all_users        | User            | Current Access, Access Request                                      | hidden              |

  Scenario Outline: Switching to a non-privileged requester persona
    When I click the User profile avatar
    And I select the "<identity_name>" identity
    Then the "Approver" tab should not be visible
    And the administrative tabs should disappear from the header navigation
    And my avatar should update to match the selected identity profile

    Examples:
      | identity_name |
      | Alice Johnson |
      | Bob Reviewer  |

  Scenario: Toggling simulation mode off enforces strict authentication
    Given I am successfully logged in using genuine SCIM token credentials
    When I open the Admin Settings modal
    And I disable the "Simulation Mode (Allow Mock Login)" toggle
    Then the Persona Switcher option should disappear from the User dropdown
    And I should no longer be able to select mock identities
    And all actions should route exclusively tied to my SCIM profile

  Scenario Outline: Mock Identifiers correctly inherit group scopes
    When I select the "<persona_name>" identity, who is assigned the "<mocked_group>" simulated group
    And I browse to the "Approver" dashboard
    Then I should be able to see pending requests for the "<owned_resource>" table I have authority over
    And I should not see unrelated requests for tables in other schemas

    Examples:
      | persona_name | mocked_group         | owned_resource |
      | Carol        | group_finance_admins | transactions   |
      | Dave         | group_hr_admins      | employees      |
