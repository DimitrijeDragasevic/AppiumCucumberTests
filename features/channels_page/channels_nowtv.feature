#FILE NAME: channels_nowtv.feature
#CREATED: 27-NOV-2018
#STEP DEFINITIONS: channels_nowtv_steps.js
#NOTES
@all_env @sanity
Feature: Channels now on tv feature
    As a Eon user
    I want to use all the available options on the channels page sub menu now on tv

Background: Navigate to the now on tv sub menu
    Given I navigate to the now on tv sub menu

Scenario: Navigate to the "Now" filter
    When I open the now filter
    Then I should see all the option that are linked to that filter

Scenario: Click on the "Now" filter
    When I press ok on the now filter
    Then I should see all the card with live content

Scenario: Click on the "Previous" filter
    When I press ok on the previous filter
    Then I should see all the channels and some catch up content

Scenario: Click on the "Next" filter
    When I press ok on the next filter
    Then I should see all the channels and all the upcoming shows

Scenario: Scroll a through a few cards
    When I am on the now on tv page
    Then I scroll through the cards and then I should see that they are highlighted also that the text is white and background is blue

Scenario: Open selected card
    When I am on the now on tv page
    Then I press ok on any card , then is should see that I am directed to the playing of that event

Scenario: Open the search form now on tv page
    When I click on the search icon
    Then I should be navigated to the search page

Scenario: Check image on a card
    When I navigate to the first card
    Then I should see that the card has a image





