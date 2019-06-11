@all_env @memory @manual
Feature: Memory profiling feature
  Script is running on STB and mesures memory footprint of the Webview proccess

  Scenario: Guide -> Player
    When I come to Guide
    Then I should randomly play TV events and open corresponding detail screen
