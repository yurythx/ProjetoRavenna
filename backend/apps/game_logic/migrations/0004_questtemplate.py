import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_logic", "0003_remove_playerinventory_items_gamesession"),
    ]

    operations = [
        migrations.CreateModel(
            name="QuestTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("quest_type", models.CharField(
                    choices=[
                        ("main", "Main Story"),
                        ("side", "Side Quest"),
                        ("daily", "Daily"),
                        ("repeatable", "Repeatable"),
                    ],
                    default="side",
                    max_length=20,
                )),
                ("objectives", models.JSONField(
                    default=list,
                    help_text='[{"key": "kill_wolf", "description": "Kill wolves", "target_count": 5}]',
                )),
                ("rewards", models.JSONField(
                    default=dict,
                    help_text='{"xp": 500, "gold": 100, "items": [{"item_template_id": "<uuid>", "quantity": 1}]}',
                )),
                ("level_required", models.IntegerField(default=1)),
                ("is_repeatable", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Quest Template",
                "verbose_name_plural": "Quest Templates",
                "db_table": "quest_templates",
                "ordering": ["level_required", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="questtemplate",
            index=models.Index(fields=["quest_type", "is_active"], name="quest_tmpl_type_active_idx"),
        ),
        migrations.AddIndex(
            model_name="questtemplate",
            index=models.Index(fields=["level_required"], name="quest_tmpl_level_idx"),
        ),
    ]
