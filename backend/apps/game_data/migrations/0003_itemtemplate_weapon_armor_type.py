from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0002_itemtemplate_equip_fields_skilltemplate_extras"),
    ]

    operations = [
        # ── Add offhand to equip_slot choices (no DB change — Django choices are metadata only)
        # ── weapon_type field ────────────────────────────────────────────────────
        migrations.AddField(
            model_name="itemtemplate",
            name="weapon_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("",       "None / Not a Weapon"),
                    ("staff",  "Staff"),
                    ("wand",   "Wand"),
                    ("sword",  "Sword"),
                    ("mace",   "Mace"),
                    ("bow",    "Bow"),
                    ("dagger", "Dagger"),
                    ("shield", "Shield"),
                ],
                default="",
                help_text="Only set for weapons/shields. Drives class restriction validation.",
                max_length=20,
            ),
        ),
        # ── armor_type field ─────────────────────────────────────────────────────
        migrations.AddField(
            model_name="itemtemplate",
            name="armor_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("",       "None / Not Armor"),
                    ("light",  "Light Armor"),
                    ("medium", "Medium Armor"),
                    ("heavy",  "Heavy Armor"),
                ],
                default="",
                help_text="Only set for armor pieces. Drives class restriction validation.",
                max_length=20,
            ),
        ),
        # ── Indexes ───────────────────────────────────────────────────────────────
        migrations.AddIndex(
            model_name="itemtemplate",
            index=models.Index(fields=["weapon_type"], name="item_templa_weapon_t_idx"),
        ),
        migrations.AddIndex(
            model_name="itemtemplate",
            index=models.Index(fields=["armor_type"], name="item_templa_armor_t_idx"),
        ),
    ]
