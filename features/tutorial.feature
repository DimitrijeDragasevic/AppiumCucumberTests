# #FILE NAME: tutorial.feature
# #CREATED: 14-MAY-2019
# #STEP DEFINITIONS: tutorial_steps.js
# #NOTES: This feature is about testing the new tutorial feature

 @tutorial @all_env
  Feature: Tutorial feature
  As a new EON user
  I should be presented with a tutorial on
  how to use the EON application


  Scenario: Starting the tutorial again
    When I select the tutorial from the options in the Settings menu
    Then I should be presented with the start of the tutorial

  Scenario: Step one of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should see live TV

  Scenario: Step two of the tutorial
    When I press the DOWN key code on the RCU
    Then I should see all the events

  Scenario: Step three of the tutorial
    When I press OK on the events
    Then I should see all the options for the selected event

  Scenario: Step four of the tutorial
    When I press OK on the first option of the event
    Then I should that the event played from the beginning

  Scenario: Step five of the tutorial
    When I press the DOWN key code on the RCU
    Then I should be presented with a message to continue

  Scenario: Step six of the tutorial
    When I press the RIGHT KeyCode on the RCU
    Then I should see a detail screen of the current event

  Scenario: Step seven of the tutorial
    When I press LEFT or BACK to return to live TV
    Then I should see that I have returned to live TV

  Scenario: Step eight of the tutorial
    When I press UP to access the progress bar
    Then I should see that the focus is on the progress bar

  Scenario: Step nine of the tutorial
    When I press the UP key code on the RCU
    Then I should be presented with a message to continue

  Scenario: Step ten of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should be on the channel list

  Scenario: Step eleven of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should be presented with a message to continue

  Scenario: Step twelve of the tutorial
    When I press the OK key code on the RCU
    Then I should see the Guide menu

  Scenario: Step thirteen of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should be presented with a message to continue

  Scenario: Step fourteen of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should be presented with a message to continue

  Scenario: Step fifteen of the tutorial
    When I press the LEFT keyCode on the RCU
    Then I should see the Main menu

  Scenario: Step sixteen of the tutorial
    When I press DOWN key code on the RCU
    Then I should be presented with a message to continue

  Scenario: Step seventeen of the tutorial
    When I press the RIGHT or OK on the RCU
    Then I should see the ON Demand menu

  Scenario: Step eighteen of the tutorial
    When I press the DOWN key code on the RCU
    Then I should be presented with a message to continue

  Scenario: Step nineteen of the tutorial
    When I press the EON button on the RCU
    Then I should see that the tutorial has ended
  @manual
  Scenario: New user tutorial screen
    When I open the application for the first time
    Then I should be presented with the start of the tutorial
