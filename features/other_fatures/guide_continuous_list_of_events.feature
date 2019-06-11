#FILE NAME: guide_continuous_list_of_events.feature
#CREATED: 19-MAR-2019
#STEP DEFINITIONS: guide_continuous_list_of_events_steps.js
#NOTES

@all_env @manual
Feature: Guide "Continuous list of events" feature

    As a Eon user
    I wish to perform actions that I am entitled to

Scenario: Navigate to "Guide" and try continuous list of events for next day
    When I open Guide and select events column
    Then I should see prev and next day events are loaded and right day is selected
