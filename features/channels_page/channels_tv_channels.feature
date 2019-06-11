#FILE NAME: channels_tv_channels.feature
#CREATED: 31-DEC-2018
#STEP DEFINITIONS: channels_tv_channels_steps.js
#NOTES
@all_env @sanity
Feature: channels tv channels feature
  As a eon user
  i want to explore
  all the tv channels options

  Background: Navigate to the tv channels page
    Given I navigate to the tv channels page

  Scenario: Detail screen
    When I am on the tv channels page
    And I press right button on the RCU multiple times
    Then I should be on the channels detail screen

  Scenario: Detail screen WATCH button
    When I am on the detail screen
    And I press OK on the RCU on the WATCH button
    Then I should see that the event is being played

  Scenario: Detail screen START OVER button
    When I am on the detail screen
    And I press OK on the RCU on the START OVER button
    Then I should see that the event is being played

  Scenario: Detail screen FAVORITES button
    When I am on the detail screen
    And I press OK on the RCU on the FAVORITES button
    Then I should see that the button is highlighted

  Scenario: Detail screen SEE FULL button
    When I am on the detail screen
    And I press OK on the RCU on the SEE FULL button
    Then I should see a detailed synopsis

  Scenario: Play live event
    When I navigate to the tv channels page and select a live event
    And I press ok on the RCU
    Then I should see a live event being played

  Scenario: Play live event from catchup
    When I am on some catchup event
    And I press the right return button on the player
    Then I should bee directed to the live content on that channel

  Scenario: Start over live event
    When I am on some live event on the page
    And I press the right return button on the playertwo
    Then I should bee directed to the live content on that channeltwo

  Scenario: Play event from the past
    When I select an event from the past and press ok on the RCU
    Then I should bee watching that past event

  @manual
  Scenario: Set remainder
    When I am in the forth column on the tv channels page
    And I press ok on any future event
    Then I should see that the bell icon is present on that specific event

  Scenario: Set favorite event
    When I navigate to the detail screen on any event on the guide and press ok
    Then I should see that the event is set to favorite events

  Scenario: Check all columns
    When I am on the tv channels sub menu page
    Then I should see the following columns categories, channels, dates and events

  Scenario: Check channel picture
    When I am on the second column
    Then I should see that the given channel has a picture

  Scenario: Check 3rd columns 7 days in the past and 3 days in the future
    When I am on the third column on the TV guide page
    Then I should see that there are seven days in the past and three days in the future

  Scenario: Check guide arrow
    When I am on the TV guide page
    Then I should see the arrow that navigates to the Detail screen

  Scenario: Play live event when past or future event is selected
    When I am on the 4th column on the TV guide page
    And I focus a past or future event
    And I go back to the second column and press OK on the RCU
    Then I should see that the currently live event is being played