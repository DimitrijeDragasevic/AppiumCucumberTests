#FILE NAME: onDemand_page.feature
#CREATED: 29-JAN-2019
#STEP DEFINITIONS: onDemand_page_steps.js
#NOTES
@all_env @sanity
Feature: On Demand feature

  As a eon user
  I want to use all the features
  that I am provided eat

  Background:
    Given I navigate to the On Demand screen

  Scenario: Check Search button functionality
    When I click on the search button
    Then I should be on the search page

  Scenario: Go through first banner
    When I am on the first banner and I press the right key code
    Then I should see that the banner is highlighted and has a description

  Scenario: Sub titles
    When I am on the On Demand page
    Then I should see all the sub titles and stripes provided

  Scenario: First stripe check
    When I am on the first stripe and press OK on the RCU
    Then I should see all the details regarding that clicked banner

  Scenario: Catalog check
    When I am on the catalog section of the page and press OK on the RCU on any catalog
    Then I should see the details of the entered catalog

  Scenario: Category stripe check
    When I am on the category stripe on the page and press OK on the RCU on any category
    Then I should see all the details regarding the entered category

  Scenario: Series detail check
    When I am on the category stripe and I press ok on the Series category
    And I press OK on the RCU on any series
    Then I should see the series detail screen

  Scenario: Series detail favorites button check
    Given I am on the category stripe and I press ok on the Series category
    Given I press OK on the RCU on any series
    Given I should see the series detail screen
    When I click on the favorite button
    Then I should see that the favorite button is highlighted

  Scenario: Season detail check
    Given I am on the series detail screen
    When I press ok on the season button
    Then I should see the season detail screen

  Scenario: Episode detail
    Given I am on the season detail screen
    When I press OK on any selected Episode
    Then I should be on the episode detail screen

  Scenario: Continue watching stripe
    When I am on the continue watching stripe on the page and press OK twice on the RCU on any asset
    Then I should see the continue watching menu

  Scenario: Continue watching stripe play asset
    When I am on prompt menu on the continue watching asset and press OK on the RCU on the first option
    Then I should see that that asset is being played

  Scenario: Continue watching stripe watch from the beginning
    When I am on prompt menu on the continue watching asset and press OK on the RCU and on the second option
    Then I should see that the asset is being played from the beginning

  Scenario: Recently added movies stripe
    When I am on the recently added stripe and I press OK on the RCU
    Then I should see all the details regarding that asset

  Scenario: Go through recently added movies stripe
    When I am on the recently added movies stripe and I press the right key code a couple of times
    Then I should see that the card are highlighted and changed color

  Scenario: Check see all button for recently added movies stripe
    When I go through the recently added movies stripe and I reach the end and press OK
    Then I should see that I have entered the see all button screen(video on demand)

  Scenario: Recently added series stripe
    When I am on the recently added series stripe and I press OK on the RCU
    Then I should see all the details regarding that asset

  Scenario: Go through recently added series stripe
    When I am on the recently added series stripe and I press the right key code a couple of times
    Then I should see that the card are highlighted and changed color

  Scenario: Check see all button for recently added series stripe
    When I go through the recently added series stripe and I reach the end and press OK
    Then I should see that I have entered the see all button screen(video on demand)

  Scenario: Recently added kids stripe
    When I am on the recently added kids stripe and I press OK on the RCU
    Then I should see all the details regarding that asset

  Scenario: Go through recently added kids stripe
    When I am on the recently added kids stripe and I press the right key code a couple of times
    Then I should see that the card are highlighted and changed color

  Scenario: Check see all button for recently added kids
    When I go through the recently added kids stripe and I reach the end and press OK
    Then I should see that I have entered the see all button screen(video on demand)