#FILE NAME: settings_page_language.feature
#CREATED: 09-JAN-2019
#STEP DEFINITIONS: settings_page_language.js
@all_env @manual
Feature: Settings page language feature

  As an Eon user
  I would like to change language options

  Background: Navigate to Language in Settings
    Given I have navigated to Language option in Settings

  Scenario: Interface Language switch
    When I have navigated to "Interface Language"
    And I change language to "Srpski"
    Then I should see "Srpski" below "Jezik interfejsa"

  Scenario: Keyboard Language switch
    When I have navigated to "Keyboard Language"
    When I change keyboard language to "Srpski"
    Then I should see "Srpski" below "Keyboard Language"

  Scenario: Voice Search Language switch
    Given I have navigated to "Voice Search Language"
    When I change voice search language to "Srpski"
    Then I should see "Srpski" below "Voice Search Language"

  Scenario: First Audio Language switch
    Given I have navigated to "First Audio Language"
    When I change first audio language to "Srpski"
    Then I should see "Srpski" below "First Audio Language"

  Scenario: Second Audio Language switch
    Given I have navigated to "Second Audio Language"
    When I change second audio language to "Srpski"
    Then I should see "Srpski" below "Second Audio Language"

  Scenario: First Subtitle Language switch
    Given I have navigated to "First Subtitle Language"
    When I change first subtitle language to "Srpski"
    Then I should see "Srpski" below "First Subtitle Language"

  Scenario: Second Subtitle Language switch
    Given I have navigated to "Second Subtitle Language"
    When I change second subtitle language to "Srpski"
    Then I should see "Srpski" below "Second Subtitle Language"