#FILE NAME: channels_radio_filter_second.feature
#CREATED: 15-JAN-2019
#STEP DEFINITIONS: channels_radio_filter_second_steps.js
#NOTES:
@all_env @sanity
Feature: Second filter of the radio cnahhels tab

  As a Eon user
  I want to filter all the radio channels
  with the option availabe

Background:
    Given I navigate to the radio channels second filter

Scenario: Open the second filter
    When I open the second filter
    Then I should see all the options availabe for this filter

Scenario: Open first filter option Recomended
    When I press OK on the RCU on the option Recomended
    Then I should see that the second filter filtered

Scenario: Open the second filter option Position
    When I press OK on the RCU on the option Position
    Then I should see that the second filter filtered

Scenario: Open the third filter option A-Z
    When I press OK on the RCU on the option A-Z
    Then I should see that the second filter filtered
