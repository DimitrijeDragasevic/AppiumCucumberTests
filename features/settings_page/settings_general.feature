#FILE NAME: settings_page_general.feature
#CREATED: 01-FEB-2019
#STEP DEFINITIONS: settings_page_general.js

@manual
Feature: Settings page general feature

  As an Eon user
  I would like to check Settings interface

  Background: Navigate to Parental Rating in Settings
    Given I have navigated to Settings

  Scenario: Summary option check
    When I navigate to Summary option
    Then I should see Summary option page

  Scenario: Personalization option check
    When I enter Personalization option
    Then I should see Personalization page

  Scenario: My Lists option check
    When I enter My Lists option
    Then I should see My Lists page

  Scenario: Language option check
    When I enter Language option
    Then I should see Language page

  Scenario: Parental Rating option check
    When I enter Parental Rating option
    Then I Enter PIN screen should appear

  Scenario: Remote option check
    When I enter Remote option
    Then I should see Remote page

  Scenario: Video & Audio check
    When I enter Video & Audio option
    Then I should see Video & Audio page

  Scenario: Network option check
    When I enter Network option
    Then I should see Network page

  Scenario: Network Status check
    Given I have entered Network page
    When I enter Network Status option
    Then I should see Network Status page

  Scenario: Network Speed check
    Given I have entered Network page
    When I enter Test Speed option
    Then I should see Speed Test Results

  Scenario: System option check
    When I enter System option
    Then I should see System page

  Scenario: System option, system information check
    Given I enter System option
    Given I should see System page
    When I enter the system information option
    Then I should see Application version, Os version, platform, Device Model and Build version

  Scenario: PIN code option check
    When I enter PIN Code option
    Then I should PIN Code page

  Scenario: Conax option check
    Given I have entered System option
    When I enter Conax option
    Then I enter Subscription option

  Scenario: ECM/EMM option check
    Given I have entered System option
    Given I have entered Conax option
    When I enter ECM/EMM option
    Then I should see ECM/EMM page

  Scenario: Contact option check
    When I enter Contact option
    Then I should see Contact page

  Scenario: Help option check
    When I enter the Help page
    Then I should see the Help page

  Scenario: EON Video Instructions check
    Given I enter the Help page
    When I enter EON Video Instructions on Help
    Then I should see EON Video Instructions Vod Detail page