from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0003_itemtemplate_weapon_armor_type"),
    ]

    operations = [
        # ── is_two_handed flag ────────────────────────────────────────────────
        migrations.AddField(
            model_name="itemtemplate",
            name="is_two_handed",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "True = occupies both weapon + offhand slots. "
                    "Equipping blocks/clears the offhand slot. "
                    "Examples: staff, bow, lance, hammer, 2H mace."
                ),
            ),
        ),
        # ── Update weapon_type choices to include lance, hammer
        # (choices are metadata only — no DB change needed, but we alter the field
        #  so Django's migration state stays in sync)
        migrations.AlterField(
            model_name="itemtemplate",
            name="weapon_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("",       "None / Not a Weapon"),
                    ("staff",  "Staff"),
                    ("wand",   "Wand"),
                    ("sword",  "Sword"),
                    ("dagger", "Dagger"),
                    ("bow",    "Bow"),
                    ("mace",   "Mace"),
                    ("hammer", "Hammer"),
                    ("lance",  "Lance"),
                    ("shield", "Shield"),
                ],
                default="",
                help_text="Only set for weapons/shields. Drives class restriction validation.",
                max_length=20,
            ),
        ),
    ]
