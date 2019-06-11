#FILE NAME: my_library.feature
#CREATED: 15-JAN-2019
#STEP DEFINITIONS: my_library_steps.js
#NOTES

@manual
Feature: My library "Reminders" feature

    As a Eon user
    I wish to perform actions that I am entitled to

Background: Navigate to the side menu button "My library"
    Given I navigate on my library screen

Scenario: Navigate to "My library" and submenu is opened
    When I open my library
    Then I should see submenu related to my library

    Scenario: Navigate to "My library" and open reminders
        When I open Reminders
        Then I should see Reminders screen

    Scenario: Event is visible in "Reminders" screen after adding reminder on "TV Channels" screen
        When I add Reminder on a specific TV event
        Then I should see specific TV event on Reminder screen

    Scenario: Event Detail on Reminder Screen has all related content
        When I open Event Detail on Reminders screen
        Then I should see all related content to Event Detail screen

    Scenario: Navigate to "My library" and open favorites
        When I open Favorites
        Then I should see Favorites screen

    Scenario: VOD Asset is visible in "Favorites" screen after adding to Favorites on "VOD Detail" screen
        When I add VOD asset to Favorites on VOD Detail screen
        Then I should see specific VOD asset on Favorites screen

    Scenario: TV Event is visible in "Favorites" screen after adding to Favorites on "TV Channels" screen
        When I add TV Event to Favorites on TV Channels screen
        Then I should see specific TV Event on Favorites screen