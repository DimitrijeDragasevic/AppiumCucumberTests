#FILE NAME: pinProtectedEvent.feature
#CREATED: 15-MAR-2019
#STEP DEFINITIONS: pinProtectedEvent_steps.js
#NOTES

Feature: Unlocked PIN protected event feature

  As a eon user
  I want to use all the features
  that I am provided at

  @manual
  Scenario: Add channels to blocked channels list
    When I navigate on settings->parental rating->blocked screen and block specific channel
    Then I should see pin popup when trying to play blocked channel

  @manual
  Scenario: Unlock event and start it over
    When I navigate to locked event, unlock it and start it over again
    Then I should see all the player elements

  @manual
  Scenario: Go back to live and expect pin popup
    When I go back to live from past event
    Then I should see pin popup and enter valid pin

  @manual
  Scenario: Go back to live on live event expect no pin pop up
    When I go back to live on live unlocked event
    Then I should see all the player elements