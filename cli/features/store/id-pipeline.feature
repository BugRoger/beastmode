@slug-id-consistency @store
Feature: Single lookup path per identifier type -- getEpic and getFeature

  The store exposes getEpic() and getFeature() as the sole lookup
  methods. The generic store.find() is removed. Each function accepts
  exactly one identifier type, eliminating dispatch ambiguity.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists with features "login-flow" and "token-cache"

  Scenario: getEpic retrieves an epic by its entity ID
    When a caller invokes getEpic with the epic's entity ID
    Then the store should return the epic
    And the epic should contain its slug and name

  Scenario: getFeature retrieves a feature by its entity ID
    When a caller invokes getFeature with the feature's entity ID
    Then the store should return the feature
    And the feature should contain its slug and parent epic reference

  Scenario: No generic find method exists on the store
    When a caller attempts to invoke a generic find method on the store
    Then the method should not exist
    And the caller should be directed to use getEpic or getFeature
