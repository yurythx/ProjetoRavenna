"""
URLs do app game_logic — montado sob /api/v1/game-logic/ em config/urls.py.

## Rotas Disponíveis

| Método        | URL                                    | View                     | Descrição                                  |
|---------------|----------------------------------------|--------------------------|---------------------------------------------|
| GET           | /                                      | PlayerInstancesView      | Stats + Inventário do jogador autenticado  |
| GET/POST      | /inventory/                            | InventoryView            | Inventário; POST admin adiciona item        |
| GET/PUT/DELETE| /inventory/<item_index>/               | InventoryItemView        | Operações em item específico por índice     |
| POST          | /inventory/equip/                      | EquipItemView            | Equipa item pelo item_id                    |
| POST          | /inventory/unequip/                    | UnequipItemView          | Desequipa item pelo item_id                 |
| GET           | /stats/                                | StatsView                | Stats do personagem                         |
| POST          | /stats/gain-xp/                        | GainExperienceView       | Ganhar XP (server-to-server)                |
| POST          | /stats/allocate/                       | AllocatePointsView       | Alocar pontos de atributo                   |
| GET           | /quests/                               | QuestProgressView        | Missões ativas do jogador                   |
| POST          | /quests/complete/                      | QuestCompleteView        | Marcar missão como concluída                |
| GET           | /skills/                               | PlayerSkillsView         | Habilidades do jogador                      |
| POST          | /skills/<skill_id>/upgrade/            | UpgradeSkillView         | Evoluir habilidade                          |
| GET           | /leaderboard/                          | LeaderboardView          | Top jogadores por XP (Redis)                |
| GET/POST      | /session/                              | GameSessionView          | Sessão de jogo ativa                        |
| GET           | /quest-templates/                      | QuestTemplatesView       | Templates de missão (estático)              |
| POST          | /events/                               | GameEventWebhookView     | Webhook de eventos do servidor Unity        |
| GET           | /game-state/<user_id>/                 | GameStateView            | Estado completo para servidor Unity         |
| GET/POST/DEL  | /party/                                | PartyView                | Consultar/criar/sair de grupo               |
| POST          | /party/invite/                         | PartyInviteView          | Convidar jogador ao grupo                   |
| POST          | /character/create/                     | CreateCharacterView      | Criar personagem no onboarding              |

## Autenticação
Todas as rotas requerem `IsAuthenticated` (JWT ou session).
Exceções: `GameEventWebhookView` usa `GameServerIPPermission` (IP allowlist + HMAC).
"""
from django.urls import path
from apps.game_logic.views import (
    AllocatePointsView,
    CreateCharacterView,
    EquipItemView,
    GameEventWebhookView,
    GameStateView,
    GainExperienceView,
    InventoryItemView,
    InventoryView,
    LeaderboardView,
    PartyInviteView,
    PartyView,
    PlayerInstancesView,
    PlayerSkillsView,
    QuestCompleteView,
    QuestProgressView,
    QuestTemplatesView,
    StatsView,
    GameSessionView,
    UnequipItemView,
    UpgradeSkillView,
)

urlpatterns = [
    path("", PlayerInstancesView.as_view(), name="player-instances"),
    path("inventory/", InventoryView.as_view(), name="inventory"),
    path("inventory/<int:item_index>/", InventoryItemView.as_view(), name="inventory-item"),
    path("inventory/equip/", EquipItemView.as_view(), name="inventory-equip"),
    path("inventory/unequip/", UnequipItemView.as_view(), name="inventory-unequip"),
    path("stats/", StatsView.as_view(), name="stats"),
    path("stats/gain-xp/", GainExperienceView.as_view(), name="gain-xp"),
    path("stats/allocate/", AllocatePointsView.as_view(), name="allocate-points"),
    path("quests/", QuestProgressView.as_view(), name="quests"),
    path("quests/complete/", QuestCompleteView.as_view(), name="quest-complete"),
    path("skills/", PlayerSkillsView.as_view(), name="skills"),
    path("skills/<uuid:skill_id>/upgrade/", UpgradeSkillView.as_view(), name="skill-upgrade"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("session/", GameSessionView.as_view(), name="game-session"),
    path("quest-templates/", QuestTemplatesView.as_view(), name="quest-templates"),
    path("events/", GameEventWebhookView.as_view(), name="game-events-webhook"),
    path("game-state/<str:user_id>/", GameStateView.as_view(), name="game-state"),
    path("party/", PartyView.as_view(), name="party"),
    path("party/invite/", PartyInviteView.as_view(), name="party-invite"),
    path("character/create/", CreateCharacterView.as_view(), name="character-create"),
]
