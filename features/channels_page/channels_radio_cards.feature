#FILE NAME: channels_radio_card.feature
#CREATED: 1-MAR-2019
#STEP DEFINITIONS: channels_radio_card_steps.js
#NOTES:
@all_env @sanity
  Feature: Channels radio card feature

    As a eon user I want to
    enter the radio channels option
    and do all the actions that
    I am entitled to.

  Scenario: Scroll through and check for text and if background is highlighted
    When I am on the radio page and go through some cards
    Then I should see that the card has an image, white text and blue background