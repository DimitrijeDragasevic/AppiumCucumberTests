#FILE NAME: channels_sort.feature
#CREATED: 15-JAN-2019
#STEP DEFINITIONS: channels_sort_steps.js
#NOTES:
@all_env @sanity
Feature: Sort filter on now on tv sub menu 
    As a eon user 
    I want to sort my content
    with all the filters that are provided 

Background:
    Given I navigate to the sort filter
   
Scenario: Navigate to the "Sort" filter 
    When I press ok on the sort menu 
    Then I should see all the options related 

Scenario: Click on "A-Z" filter option
    When I press ok on the A-Z filter
    Then I should see all the content sorted from A-Z

Scenario: Click on "Position" filter option
    When I press ok on the position filter
    Then I should see all the position switched from A-Z to Z-A

Scenario: Click on Recommended filter option
    When I press ok on the Recommended option
    Then I should see all the Recommended cards