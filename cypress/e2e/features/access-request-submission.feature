Feature: Access Request Form Submission
  As a Data Consumer
  I want to submit access control requests for catalog objects
  So that I can gain the necessary permissions for my work

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
      | missing_field          |
      | catalog object         |
      | principal              |
      | permission type        |
      | business justification |

  Scenario Outline: Searching for and selecting a principal
    Given I have selected the "transactions" from the catalog tree
    When I type "<search_term>" into the principal search box
    Then the "<target_principal>" should appear in the combobox dropdown

    Examples:
      | search_term | target_principal     |
      | Finance     | Finance Admins       |
      | HR          | HR Admins            |
      | Marketing   | Marketing            |

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
      | transactions   | Finance Admins       | SELECT     | Quarterly reporting needs |
      | payroll        | HR Admins            | MODIFY     | Annual reviews update     |
      | campaigns      | Marketing            | SELECT     | Campaign performance audit|

  Scenario Outline: Adding a time constraint to the access request
    Given I have selected the "transactions" from the catalog tree
    And I have selected the "Finance Admins" principal
    And I have selected the "SELECT" permission type
    And I have entered the business justification "Time constraint test"
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
      | transactions   | Finance Admins       | SELECT          |
      | payroll        | Finance Admins       | ALL_PRIVILEGES  |
      | campaigns      | Marketing            | MODIFY          |
      | training_data  | Data Scientists      | READ_VOLUME     |
