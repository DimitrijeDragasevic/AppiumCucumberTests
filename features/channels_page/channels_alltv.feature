#FILE NAME: channels_alltv.feature
#CREATED: 27-DEC-2018
#STEP DEFINITIONS: channels_alltv_steps.js
#NOTES
@all_env @sanity
Feature: Channels all tv filter feature

   As a eon user I want to
   filter my channels
   with the filters provided

Background: Navigate to the all tv filter
    Given I have navigated to the all tv filter

Scenario: Navigate to the "ALL TV" filter
    When I press ok to the all tv filter
    Then I should see all the options for this filter

Scenario: Navigate to the  "Kids" filter
    When I press ok on the kids filter
    Then I should see all the channels that are playing live kids content

Scenario: Navigate to the  "Sports" filter
    When I press ok on the sport filter
    Then I should see all the channels that are playing live sports content

Scenario: Navigate to the "HD" filter
    When I press ok on the HD filter
    Then I should see all the channels that are playing live HD content

Scenario: Navigate to the "Music" filter
    When I press ok on the music filter
    Then I should see all the channels that are playing live music content

Scenario: Navigate to the "informative" filter
    When I press ok on the informative filter
    Then I should see all the channels that are playing live informative content

Scenario: Navigate to the "Movies" filter
    When I press ok on the Movies filter
    Then I should see all the channels that are playing Movie content

Scenario: Navigate to the "Entertainment" filter
    When I press ok on the entertainment filter 
    Then I should see all the channels playing the entertainment content

Scenario: Navigate to the "Documentary" filter
    When I press ok on the documentary filter
    Then I should see all the channels playing the documentary content

Scenario: Navigate to the "Local TV" filter
    When I press ok on the Local tv filter
    Then I should see all the channels playing the local tv content 

Scenario: Navigate to the "Regional TV" filter
    When I press ok on the Regional filter
    Then I should see all the channels playing the Regional content

Scenario: Navigate to the "International TV" filter
    When I press ok on the International filter
    Then I should see all the channels playing the International content live

Scenario: Navigate to the "Adult" filter
    When I press ok on the adult filter
    Then I should see all the channels that a playing adult content live 