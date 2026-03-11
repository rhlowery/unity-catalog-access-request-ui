Feature: Reviewer Current Access
  As a Data Security Admin or Object Owner
  I want to view who currently has access to a specific Unity Catalog object
  So that I can verify policy compliance and revoke unnecessary privileges

  Background:
    Given the application is running
    And I am logged in as a user with at least "Security Admin" or "Platform Admin" persona
    And the mock data service is connected

  Scenario Outline: Viewing active grants on a selected object
    When I select the "<catalog_object>" from the catalog tree
    And I navigate to the "Current Access" tab
    Then I should see the principal "<principal>" listed in the grants table
    And the principal should have the "<permission>" permission
    And the access source should indicate "<access_source>" status

    Examples:
      | catalog_object               | principal             | permission      | access_source |
      | finance.transactions         | group_finance_admins  | ALL_PRIVILEGES  | LIVE          |
      | hr.employees                 | group_hr_admins       | SELECT          | LIVE          |
      | risk_analytics.credit_scores | group_risk_analysts   | SELECT          | LIVE          |

  Scenario Outline: Empty state when no explicit grants exist
    When I select the "<catalog_object>" from the catalog tree
    And I navigate to the "Current Access" tab
    Then I should see an empty state warning indicating no explicit permissions are configured
    And the grants table should contain zero rows

    Examples:
      | catalog_object              |
      | marketing.campaigns         |
      | ai_governance.training_data |

  Scenario Outline: Live data retrieval from Unity Catalog APIs
    Given the "<storage_adapter>" storage adapter is active
    When I select the "<catalog_object>" table
    And I navigate to the "Current Access" tab
    Then the app should call the "<api_endpoint>" endpoint using the configured M2M token
    And it should parse the live REST response into the grants list

    Examples:
      | storage_adapter       | catalog_object | api_endpoint                                     |
      | Unity Catalog Schema  | transactions   | /api/2.1/unity-catalog/permissions/table         |
      | Unity Catalog Schema  | campaigns      | /api/2.1/unity-catalog/permissions/table         |

  Scenario Outline: Revoking access directly from the Reviewer tab
    Given "<principal>" has an active grant on "<catalog_object>"
    When I navigate to the "Current Access" tab
    And I click the "Revoke Access" button next to "<principal>"
    And I provide the justification "<justification>"
    Then the row for "<principal>" should disappear from the grants table
    And the revocation should be recorded in the Audit Log

    Examples:
      | catalog_object       | principal          | justification          |
      | finance.transactions | user_cfo           | Role transition        |
      | hr.employees         | group_temps        | Contract termination   |
      | marketing.campaigns  | user_marketing_lead| Team restructure       |
