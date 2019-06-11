#FILE NAME: channels_sub_menu.feature
#CREATED: 19-FEB-2019
#STEP DEFINITIONS: channels_sub_menu_steps.js
#NOTES:
@all_env @sanity
  Feature: Channels Page
    As a eon user i want to
    check out the sub menu
    options


  Scenario: Enter now on Tv sub menu with OK key code
    When I am on the landing page of the application
    Then I press OK on the first sub menu option and then I should be on the now on tv page

  Scenario: Enter channels sub menu with OK key code
    When I am on the landing page of the application
    Then I press OK on the second sub menu option and then I should be on the channels page

  Scenario: Enter radio channels sub menu with OK key code
    When I am on the landing page of the application
    Then I press ok on the third sub menu option and then I should be on the radio Page