# #FILE NAME: player_ui.feature
# #CREATED: 11-FEB-2019
# #STEP DEFINITIONS: player_ui_steps.js
# #NOTES: This feature is about testing the player ui elements

@all_env @sanity
  Feature: player ui feature
    As a eon user
    I want to use the player
    with the action that I am entitled with

  Background: Navigate to player
    Given I navigate to the player

  Scenario: Check all off the player elements
    When I press the UP key code on the RCU
    Then I should see all the player elements

  Scenario: Check Zap banner with event list stripe
    When I press the DOWN key code on the RCU
    Then I should see the Zap banner with event list and other player elements

  Scenario: Check event list stripe buttons
    When I press DOWN key code on the RCU
    And I choose a card from the provided stripe
    Then I should see the buttons play, rewind and details on the selected card

  Scenario: Check channels stripe
    When I press the DOWN key code twice on the RCU
    And I press the LEFT keyCode on the RCU
    Then I should see the channels stripe and other player elements

  Scenario: Check Detail screen
    When I press the DOWN key code two times on the RCU
    And I press the RIGHT KeyCode on the RCU
    Then I should see the Detail screen

  Scenario: Check Detail screen WATCH button
    When I press the OK key code on the WATCH button
    Then I should see that the content is playing and the player elements are present

  Scenario: Check Detail screen START OVER button
    When I press the OK key code on the START OVER button
    Then I should see that content is playing and the player elements are present

  Scenario: Check Detail screen FAVORITES button
    When I press the OK key code on the FAVORITES button
    Then I should see that the option is enabled

  Scenario: Check Detail screen See full button
    When I press the OK key code on the See full button
    Then I should see a detailed description of the playing event

