# #FILE NAME: player_vod_ui.feature
# #CREATED: 11-FEB-2019
# #STEP DEFINITIONS: player_vod_ui_steps.js
# #NOTES: This feature is about testing the player ui elements

@all_env @sanity
  Feature: player ui feature
    As a eon user
    I want to use the player
    with the action that I am entitled with

  Background: Navigate to vod player
    Given I have navigated to the vod player

    Scenario:  Check vod player elements
      When I press the UP or DOWN key code on the RCU
      Then I should see the vod player elements

    Scenario: Play and Pause button check
      When I press the OK key code on the RCU
      Then I should see that the play icon has changed to play and vice versa

