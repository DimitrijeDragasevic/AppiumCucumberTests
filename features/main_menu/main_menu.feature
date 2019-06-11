#FILE NAME: main_menu.feature
#CREATED: 9-NOV-2018
#STEP DEFINITIONS: main_menu_steps.js
#NOTES
@all_env @sanity
Feature: Main Menu feature

  As a Eon user
  I wish to perform actions that I am entitled to

  Scenario: Start the application
    When I open the application
    Then I should see the side menu and the main content

  Scenario: Navigate to the side menu button "Home"
    When I click on the side menu home button
    Then I should see all the content related to the home button

  Scenario: Navigate to the side menu button "Home" using the right key code
    When I press the right key code on the side menu home button
    Then I should see all the content related to the home button

  Scenario: Navigate to side menu button "Channels"
    When I click on the side menu channels button
    Then I should see all the content related to the Channels button

  Scenario: Navigate to side menu button "Channels" using the right key code
    When I press the right key code on the side menu channels button
    Then I should see all the content related to the Channels button

  Scenario: Navigate to side menu button "On Demand"
    When I click on the side menu button On Demand
    Then I should see all the related content to the On Demand button

  Scenario: Navigate to side menu button "On Demand" using the right key code
    When I press the right key code on the side menu button On Demand
    Then I should see all the related content to the On Demand button

  Scenario: Navigate to side menu button "My Library"
    When I click on the side menu button My Library
    Then I should see all the related content to the My Library

  Scenario: Navigate to side menu button "My Library" using the right key code
    When I press the right key code on the side menu button My Library
    Then I should see all the related content to the My Library

  Scenario: Navigate to side menu button "Settings"
    When I click on the side menu button Settings
    Then I should see all the content related to the Settings button

  Scenario: Navigate to side menu button "Settings" using the right key code
    When I press the right key code on the side menu button Settings
    Then I should see all the content related to the Settings button

  Scenario: Navigate to side menu button "Watch"
    When I click on the side menu Watch button
    Then I should see all the content related to the Watch button

  Scenario: Navigate to the player from the main menu
    When I am on the main menu
    And I press the left key code on the RCU
    Then I should be directed to the player

  Scenario: Check for clock
    When I am on the main menu
    Then I should see a clock which tells the current time

  Scenario: Press the back button while on the main menu
    When I press the back key code on the main menu
    Then I should see the player and live content
