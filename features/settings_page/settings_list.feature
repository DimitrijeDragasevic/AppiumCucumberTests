#FILE NAME: settings_list.feature
#CREATED: 13-MAR-2019
#STEP DEFINITIONS: settings_list_steps.js
@all_env @manual
Feature: Settings list feature

  As a eon user
  I should perform all the actions
  that I am entitled to

  Background:
    Given I have navigated to my list option in the settings menu
@manual
  Scenario: Open the My lists menu
    When I am on the on my list menu
    Then I should see the following two options TV lists and Radio Channels Lists

  Scenario: Tv List menu check
    When I open the the Tv list menu
    Then I should see multiple options available

  Scenario: Tv lists list order option
    When I open the TV lists list order option
    Then I should see all the channel category's

  Scenario: Radio Channels Lists
    When I open the Radio channels lists option
    Then I should see multiple options available

  Scenario: Radio Channels lists order
    When I open the radio channels lists option
    Then I should see all the radio category's