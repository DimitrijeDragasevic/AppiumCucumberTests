#FILE NAME: disableMoreLikeThis.feature
#CREATED: 26-MAR-2019
#STEP DEFINITIONS: disableMoreLikeThis_steps.js
#NOTES

Feature: Disable More Like This on VOD Landing page

   As a eon user 
   I want to use all the features
   that I am provided at
@manual
Scenario: Add Episode to Continue Watching section
    When I navigate to episode
    Then I should not see More like this stripe and MORE button
