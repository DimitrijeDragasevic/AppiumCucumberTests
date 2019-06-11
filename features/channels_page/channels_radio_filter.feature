#FILE NAME: channels_radio_filter.feature
#CREATED: 14-JAN-2019
#STEP DEFINITIONS: channels_radio_filter_steps.js
#NOTES:
@all_env @sanity
Feature: Radio channels feature

   As a eon user 
   I want to checkout the radio channels tab
   and i want to perform all the actions that
   I am entitled to do 

   Background:
        Given I navigate to the radio channels tab

   Scenario: Open lists filter
        When I press OK on the RCU on the first filter
        Then I should see all the options available

    Scenario: Open filter first option Stingray
        When I press OK on the RCU on the Stingray option
        Then I should see that the filter selected filtered

    Scenario: Open filter second option POP
        When I press OK on the RCU on the POP option
        Then I should see that the filter selected filtered

    Scenario: Open filter third option Local POP
        When I press OK on the RCU on the Local POP option
        Then I should see that the filter selected filtered
