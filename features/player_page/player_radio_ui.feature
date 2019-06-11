# #FILE NAME: player_radio_ui.feature
# #CREATED: 11-FEB-2019
# #STEP DEFINITIONS: player_radio_ui_steps.js
# #NOTES: This feature is about testing the player ui elements

@all_env @sanity
  Feature: player ui feature
    As a eon user
    I want to use the player
    with the action that I am entitled with

  Background: Navigate to the radio player
    Given I have navigated to the radio player

    Scenario: Check radio player elements
      When I press the UP keyCode on the RCU
      Then I should see the radio player elements

    Scenario: Change radio channel
      When I press the channelUp button on the RCU
      Then I should see that the radio channel has changed
