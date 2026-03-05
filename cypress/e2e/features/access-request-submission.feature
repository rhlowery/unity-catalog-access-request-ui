Feature: Access Request Form Submission
  As a Data Consumer
  I want to submit valid access requests with appropriate justification
  So that I can gain timely access to the Unity Catalog objects I need

  Background:
    Given the application is running
    And I am logged in as a standard user
    And the mock identity system is loaded

  Scenario Outline: Form validation blocks incomplete submissions
    Given I have selected the "<missing_field>" field is empty
    When I click the Submit Request button
    Then I should see a validation warning about "<missing_field>"
    And the request should not be submitted

    Examples:
      | missing_field         |
      | principal             |
      | catalog object        |
      | permission type       |
      | business justification|

  Scenario Outline: Searching for and selecting a principal
    When I type "<search_term>" into the principal search box
    Then the "<target_principal>" should appear in the combobox dropdown
    When I select the "<target_principal>"
    Then the selected principal badge should appear showing "<target_principal>"

    Examples:
      | search_term | target_principal     |
      | Finance     | group_finance_admins |
      | HR          | group_hr_admins      |
      | Marketing   | group_marketing      |

  Scenario Outline: Submitting a fully populated access request
    Given I have selected the "<catalog_object>" from the catalog tree
    And I have selected the "<principal>" principal
    And I have selected the "<permission>" permission type
    And I have entered the business justification "<justification>"
    When I click the Submit Request button
    Then the submission confirmation modal should appear
    And after processing, a successful submission toast should appear
    And the form should reset to its default state

    Examples:
      | catalog_object | principal            | permission | justification             |
      | transactions   | group_finance_admins | SELECT     | Quarterly reporting needs |
      | employees      | group_hr_admins      | MODIFY     | Annual reviews update     |
      | campaigns      | group_marketing      | SELECT     | Campaign performance audit|

  Scenario Outline: Adding a time constraint to the access request
    When I open the "Expiration Constraints" accordion
    And I toggle the "Set expiration date or time limit" switch
    And I choose a "<duration>" hour duration limit
    And I submit the valid access request
    Then the pending request payload should include the duration limit of "<duration>" hours

    Examples:
      | duration |
      | 24       |
      | 48       |
      | 168      |

  Scenario Outline: Requesting different permission levels
    Given I have selected the "<catalog_object>" from the catalog tree
    And I have selected the principal "<principal>"
    When I select the "<permission>" permission type
    Then the permission badge should update to show "<permission>"
    And the form should allow request submission

    Examples:
      | catalog_object | principal            | permission      |
      | transactions   | group_finance_admins | SELECT          |
      | payroll        | group_finance_admins | ALL_PRIVILEGES  |
      | campaigns      | group_marketing      | MODIFY          |
      | training_data  | group_data_scientists| READ_VOLUME     |
