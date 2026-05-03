from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_logic", "0006_playerstats_last_pos"),
    ]

    operations = [
        # ── PlayerStats: faction / class / race ──────────────────────────────────
        migrations.AddField(
            model_name="playerstats",
            name="faction",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "None"),
                    ("vanguarda", "Vanguarda da Alvorada"),
                    ("legiao", "Legião do Eclipse"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="playerstats",
            name="character_class",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "None"),
                    ("paladino", "Paladino"),
                    ("mage", "Mage"),
                    ("archer", "Archer"),
                    ("eldari", "Eldari"),
                    ("cavaleiro_dragao", "Cavaleiro Dragão"),
                    ("ignis", "Ignis"),
                    ("shadow", "Shadow"),
                    ("necromante", "Necromante"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="playerstats",
            name="race",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "None"),
                    ("humano", "Humano"),
                    ("elfo", "Elfo"),
                    ("draconato", "Draconato"),
                    ("morto_vivo", "Morto-Vivo"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="playerstats",
            index=models.Index(fields=["faction"], name="player_stat_faction_idx"),
        ),
        migrations.AddIndex(
            model_name="playerstats",
            index=models.Index(fields=["character_class"], name="player_stat_class_idx"),
        ),
        # ── PlayerItem: equip_slot + uniqueness constraint ────────────────────────
        migrations.AddField(
            model_name="playeritem",
            name="equip_slot",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddIndex(
            model_name="playeritem",
            index=models.Index(fields=["inventory", "equip_slot"], name="player_item_inv_slot_idx"),
        ),
        migrations.AddConstraint(
            model_name="playeritem",
            constraint=models.UniqueConstraint(
                condition=models.Q(equip_slot__gt=""),
                fields=["inventory", "equip_slot"],
                name="unique_equipped_slot_per_inventory",
            ),
        ),
    ]
