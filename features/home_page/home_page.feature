#FILE NAME: home_page.feature
#CREATED: 19-NOV-2018
#STEP DEFINITIONS: home_page_steps.js
#NOTES
@all_env @sanity
Feature: Home page feature

  As a Eon user
  I want to use all the available options on the home page

  @manual
  Scenario: Navigate to the Search button
    When I navigate to the search button
    Then I should be able to search for a specific item

  @manual
  Scenario: Navigate to the Search button
    When I navigate to the search button
    And I enter the item that I searched for
    Then I should be able to see and access that item

  @manual
  Scenario: Search for a item that does not exist
    When I navigate to the search button
    And I search for an item that does not exist
    Then I should not be able to see it

  Scenario: Check for basic elements
    When I press the right key code on the remote
    Then I should see all the elements regarding the home page

  Scenario: Navigate to the carousel menu on the home page
    When I press the right key code on the remote
    Then I should be on the carousel menu

  Scenario: Moving through all the carousel menu banner
    When I press the right key code on the remote
    And I should be on the carousel menu
    Then I press right a couple of times, then should see that I have moved through all the cards on the stripe

  Scenario: Click on the carousel menu card
    When I press the right key code on the remote
    And I click on one of the cards
    Then I should be able to see all the details about it

  Scenario: Navigate to the "NOW ON TV" menu on the page
    When I press the right key code on the remote
    And I press down key code on the remote
    Then I should be on the now on tv menu

  Scenario: Move through the "NOW ON TV" cards
    When I press the right key code on the remote
    And I press down key code on the remote
    Then I press right a couple of times, then should see that I have moved through all the cards on the now on tv stripe

  Scenario: Check the "NOW ON TV" elements
    When I press the right key code on the remote
    And I press down key code on the remote
    Then I should see the now on tv cards with an image and text

  Scenario: "NOW ON TV" see all button check
    When I press the right key code on the remote
    And I press down key code on the remote
    Then I press ok on the see all button and I should bee on the channels Now on tv menu

  Scenario: Click on one of the "NOW ON TV" cards
    When I press the right key code on the remote
    And I press down key code on the remote
    Then I click on the selected card and check if the card clicked is valid

  Scenario: Navigate to the "ON DEMAND" menu on the page
    When I press the right key code on the remote
    And I press the down keycode twice
    Then I should be on the on demand menu and check the card details

  Scenario: go through all the "ON DEMAND" cards
    When I press the right key code on the remote
    And I press the down keycode twice
    Then I press the right key code a couple of times then I should have go though all the On demand cards

  Scenario: "ON DEMAND" see all button check
    When I press the right key code on the remote
    And I press the down keycode twice
    Then I press ok on the see all button, then I should bee on the on demand catalogs screen

  Scenario: Click on one of the 'ON DEMAND' cards
    When I press the right key code on the remote
    And I press the down keycode twice
    And I click on one of the on demand cards
    Then I should be able to see all the details regarding that card

  Scenario: Navigate to the "RADIO CHANNELS" menu on the page
    When I press the right key code on the remote
    And I press the down keycode three times
    Then I should be on the radio channels menu

  Scenario: Go through all the "RADIO CHANNEL" cards
    When I press the right key code on the remote
    And I press the down keycode three times
    Then I press RIGHT a couple of times, then I should see the see all radio channels button which I enter and checkout the details

  Scenario: Click on one of the "RADIO CHANNELS" cards
    When I press the right key code on the remote
    And I press the down keycode three times
    And I click on one of the radio channel cards
    Then I should see all the information displayed for that radio channel




