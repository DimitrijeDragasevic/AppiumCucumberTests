#FILE NAME: onDemand_page.feature
#CREATED: 29-JAN-2019
#STEP DEFINITIONS: onDemand_page_steps.js
#NOTES

Feature: Blocked Channels feature

   As a eon user 
   I want to use all the features
   that I am provided at
@manual
Scenario: Add channels to blocked channels list
    When I navigate on settings->parental rating->blocked screen and block specific channel
    Then I should see pin popup when trying to play specific channel
