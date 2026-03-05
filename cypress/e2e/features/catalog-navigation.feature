Feature: Catalog Navigation and Selection
  As a Data Consumer
  I want to browse the Unity Catalog hierarchy
  So that I can easily find the data assets I need to request access to

  Background:
    Given the application is running
    And I am logged in as a standard user
    And the mock catalog data is loaded in the sidebar

  Scenario Outline: Expanding a catalog to browse schemas
    When I expand the "<catalog>" folder in the sidebar
    Then I should see the schema "<schema1>" listed
    And I should see the schema "<schema2>" listed
    And the tree items should be correctly indented to show the hierarchy

    Examples:
      | catalog             | schema1  | schema2           |
      | main_catalog        | finance  | marketing         |
      | risk_analytics      | credit_risk | market_risk    |
      | customer_analytics  | customer_360 | behavioral_analytics |

  Scenario Outline: Selecting a single table to request access
    When I expand the "<catalog>" catalog
    And I expand the "<schema>" schema
    And I select the "<table>" table
    Then the "<table>" should appear in the selection tags area
    And the selected object count badge should show "1"

    Examples:
      | catalog      | schema    | table        |
      | main_catalog | finance   | transactions |
      | main_catalog | finance   | payroll      |
      | main_catalog | marketing | campaigns    |

  Scenario Outline: Multi-selecting objects across schemas
    When I select the "<object1>" from the "<schema1>" schema
    And I hold the meta key and select the "<object2>" from the "<schema2>" schema
    Then both "<object1>" and "<object2>" should appear in the selection tags area
    And the selected count badge should show "2"
    And both objects should be passed to the active content view

    Examples:
      | schema1  | object1      | schema2   | object2   |
      | finance  | transactions | marketing | campaigns |
      | hr       | employees    | finance   | payroll   |

  Scenario Outline: Searching by keyword within the catalog tree
    When I type "<search_term>" into the catalog tree search box
    Then only the "<expected_result>" matching node should be visible
    And non-matching catalog nodes should be hidden

    Examples:
      | search_term  | expected_result       |
      | transactions | finance.transactions  |
      | employees    | hr.employees          |
      | campaigns    | marketing.campaigns   |

  Scenario: Clearing all selections
    Given I have multiple catalog objects selected
    When I click the "Clear Items" button
    Then all checkboxes in the tree should become deselected
    And the selection tags area should be empty
    And the selected count badge should show "0"
