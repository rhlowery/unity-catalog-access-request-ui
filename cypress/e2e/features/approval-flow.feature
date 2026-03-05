@approval-flow
Feature: Access Request Approval Flow
  As an approver, I need to review and approve access requests
  So that users can be granted the right permissions to Unity Catalog resources

  Background:
    Given the application is running
    And the mock identity system is configured

  Scenario Outline: Submitting and approving access requests end-to-end
    Given I am logged in as "<requester>"
    When I select the catalog object "<catalog_object>"
    And I select the principal "<principal>"
    And I select the permission "<permission>"
    And I enter a justification "<justification>"
    And I click the submit button
    Then I should see a success notification
    And the request should appear in my pending requests list

    When I switch to the "<approver_persona>" persona via the persona switcher
    Then I should see the "Approver" tab become active
    When I click on the "Approver" tab
    Then I should see the pending request for "<catalog_object>"
    When I click "Approve" on the pending request
    Then the request status should change to "APPROVED"
    And I should see a confirmation toast message

    When I navigate to the "Audit Log" tab
    Then I should see an audit entry for the approval action
    And the audit entry should contain the action type "APPROVED"
    And the audit entry should contain "<catalog_object>"

    Examples:
      | requester | catalog_object                   | principal         | permission | justification                         | approver_persona     |
      | alice     | sales.transactions.summary_table | bob@example.com   | SELECT     | Need access for Q4 reporting analysis | group_finance_admins |
      | bob       | marketing.campaigns              | alice@example.com | MODIFY     | Data adjustment required              | group_security       |

  Scenario Outline: Approver denies an access request with a reason
    Given I am logged in as an approver in group "<approver_group>"
    And there is a pending access request for "<catalog_object>" from "<requester>"
    When I click on the "Approver" tab
    And I click "Deny" on the pending request
    And I provide the denial reason "<denial_reason>"
    Then the request status should change to "DENIED"
    And the requester should see a denial notification with the reason
    And the denial reason "<denial_reason>" should appear in the Audit Log

    Examples:
      | approver_group       | catalog_object    | requester | denial_reason                          |
      | group_finance_admins | transactions      | alice     | Access not justified for current role  |
      | group_hr_admins      | employees         | bob       | Pending role revalidation              |

  Scenario Outline: Approval requires all approvers in the workflow
    Given a request targets the "<catalog_object>" owned by multiple groups
    And the required approvers are "<approver_group_1>" and "<approver_group_2>"
    When "<approver_group_1>" approves the request
    Then the overall request status should remain "PENDING"
    When "<approver_group_2>" also approves the request
    Then the overall request status should change to "APPROVED"

    Examples:
      | catalog_object | approver_group_1     | approver_group_2 |
      | transactions   | group_finance_admins | group_governance |
      | employees      | group_hr_admins      | group_governance |
