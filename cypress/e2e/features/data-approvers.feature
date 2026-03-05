Feature: Data Approvers Management
  As a Security Admin or Platform Admin
  I want to configure required approver groups for specific data objects
  So that access requests are automatically routed to the appropriate governing bodies

  Background:
    Given the application is running
    And I am logged in as a user with "Security Admin" or "Platform Admin" persona
    And the mock identity system is configured

  Scenario Outline: Viewing inherited data approvers on a child node
    When I navigate to the "Data Approvers" tab
    And I select the "<child_object>" from the catalog tree
    Then I should see that it inherits approvers from its parent "<parent_node>"
    And the inherited approver badge should show "<inherited_approver_group>"
    And the effective approvers should be clearly displayed

    Examples:
      | child_object             | parent_node  | inherited_approver_group |
      | finance.transactions     | main_catalog | group_finance_admins      |
      | marketing.campaigns      | main_catalog | group_marketing_admins    |
      | risk_analytics.credit_scores | risk_analytics | group_risk_analysts  |

  Scenario Outline: Overriding inherited approvers for a specific object
    When I navigate to the "Data Approvers" tab
    And I select the "<target_object>" from the catalog tree
    And I click "Override Inherited Approvers"
    Then the inherited badge should disappear
    When I select the "<override_group>" group as the approver
    And I save the configuration
    Then the "<override_group>" should be stored as the required approver for "<target_object>"
    And access requests for "<target_object>" should route to "<override_group>"

    Examples:
      | target_object            | override_group        |
      | finance.transactions     | group_finance_admins  |
      | hr.employees             | group_hr_admins       |
      | marketing.campaigns      | group_marketing       |

  Scenario Outline: Resetting an override to restore inheritance
    Given the "<target_object>" currently has an explicit override set to "<override_group>"
    When I navigate to the "Data Approvers" tab
    And I select the "<target_object>"
    And I click "Reset to Inherited"
    Then the override should be removed
    And the inherited approver badge should reappear showing "<parent_approver>"

    Examples:
      | target_object         | override_group        | parent_approver      |
      | finance.transactions  | group_finance_admins  | group_governance     |
      | marketing.campaigns   | group_marketing       | group_governance     |

  Scenario Outline: Bulk configuration of data approvers across multiple objects
    When I navigate to the "Data Approvers" tab
    And I shift-select both "<object1>" and "<object2>" from the catalog tree
    Then I should see the Bulk Configuration panel appear
    When I click "Override Inherited Approvers"
    And I select the "<admin_group>" group
    And I save the bulk configuration
    Then "<admin_group>" should be stored as the required approver for both "<object1>" and "<object2>"

    Examples:
      | object1              | object2  | admin_group           |
      | finance.transactions | finance.payroll | group_finance_admins |
      | hr.employees         | hr.org_chart    | group_hr_admins      |

  Scenario Outline: Approver group must be honoured in access request routing
    Given "<approver_group>" is configured as the required approver for "<catalog_object>"
    When a user submits an access request for "<catalog_object>"
    Then the request should appear in the "Approver" dashboard for users in "<approver_group>"
    And users NOT in "<approver_group>" should not see the request

    Examples:
      | catalog_object       | approver_group        |
      | finance.transactions | group_finance_admins  |
      | hr.employees         | group_hr_admins       |
      | marketing.campaigns  | group_marketing       |
