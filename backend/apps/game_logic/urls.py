from django.urls import path
from apps.game_logic.views import (
    AllocatePointsView,
    GameEventWebhookView,
    GainExperienceView,
    InventoryItemView,
    InventoryView,
    LeaderboardView,
    PlayerInstancesView,
    PlayerSkillsView,
    QuestCompleteView,
    QuestProgressView,
    StatsView,
    GameSessionView,
)

urlpatterns = [
    path("", PlayerInstancesView.as_view(), name="player-instances"),
    path("inventory/", InventoryView.as_view(), name="inventory"),
    path("inventory/<int:item_index>/", InventoryItemView.as_view(), name="inventory-item"),
    path("stats/", StatsView.as_view(), name="stats"),
    path("stats/gain-xp/", GainExperienceView.as_view(), name="gain-xp"),
    path("stats/allocate/", AllocatePointsView.as_view(), name="allocate-points"),
    path("quests/", QuestProgressView.as_view(), name="quests"),
    path("quests/complete/", QuestCompleteView.as_view(), name="quest-complete"),
    path("skills/", PlayerSkillsView.as_view(), name="skills"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("session/",     GameSessionView.as_view(),      name="game-session"),
    path("events/",      GameEventWebhookView.as_view(), name="game-events-webhook"),
]
