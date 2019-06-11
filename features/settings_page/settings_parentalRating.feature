#FILE NAME: settings_page_parental_rating.feature
#CREATED: 24-JAN-2019
#STEP DEFINITIONS: settings_page_parental_rating.js
@all_env @manual
Feature: Settings page Parental Rating feature

  As an Eon user
  I would like to change age restriction on content

  Background: Navigate to Parental Rating in Settings
    Given I have navigated to Parental Rating in Settings

  Scenario: Parental rating correct pin
    When I enter my PIN
    Then I should see Parental Rating page

  Scenario: Parental Rating wrong PIN
    When I enter my PIN wrong
    Then I should see Parental Control message

  Scenario: Parental rating allowed age 12
    When I change Allowed Age Rating to 12
    Then PIN should be required on "The Amityville Horror"
    And PIN should be required on "Legion"
    And PIN should be required on "Prevenge"

  Scenario: Parental rating allowed age 16
    When I change Allowed Age Rating to 16
    Then PIN should be required on "Legion"
    And PIN should be required on "Prevenge"
    But PIN shouldn't be required on "The Amityville Horror"

  Scenario: Parental rating allowed age 18
    When I change Allowed Age Rating to 18
    Then PIN should be required on "Prevenge"
    But PIN shouldn't be required on "The Amityville Horror"
    And PIN shouldn't be required on "Legion"

  Scenario: Parental rating allowed age Allow All
    When I change Allowed Age Rating to Allow All
    Then PIN shouldn't be required on "The Amityville Horror"
    And PIN shouldn't be required on "Legion"
    And PIN shouldn't be required on "Prevenge"