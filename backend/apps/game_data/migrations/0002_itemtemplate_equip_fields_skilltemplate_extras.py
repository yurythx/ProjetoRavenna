from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0001_initial"),
    ]

    operations = [
        # ── ItemTemplate: rename legacy fields ──────────────────────────────────
        migrations.RenameField(
            model_name="itemtemplate",
            old_name="base_damage",
            new_name="base_phys_damage",
        ),
        migrations.RenameField(
            model_name="itemtemplate",
            old_name="base_defense",
            new_name="base_phys_defense",
        ),
        # ── ItemTemplate: new combat fields ──────────────────────────────────────
        migrations.AddField(
            model_name="itemtemplate",
            name="base_mag_damage",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="itemtemplate",
            name="base_mag_defense",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="itemtemplate",
            name="base_attack_speed",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="itemtemplate",
            name="base_speed",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="itemtemplate",
            name="equip_slot",
            field=models.CharField(
                blank=True,
                choices=[
                    ("weapon", "Weapon"),
                    ("helmet", "Helmet"),
                    ("chest", "Chest"),
                    ("gloves", "Gloves"),
                    ("boots", "Boots"),
                    ("ring", "Ring"),
                    ("amulet", "Amulet"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="itemtemplate",
            index=models.Index(fields=["equip_slot"], name="item_templa_equip_s_idx"),
        ),
        # ── SkillTemplate: class/passive/server metadata ──────────────────────────
        migrations.AddField(
            model_name="skilltemplate",
            name="class_restriction",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Empty = available to all. E.g. 'paladino', 'mage'.",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="skilltemplate",
            name="is_passive",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="skilltemplate",
            name="is_racial_passive",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="skilltemplate",
            name="server_id",
            field=models.IntegerField(
                blank=True,
                help_text="Matches the uint skill ID in the C# SkillRegistry. Null = not server-side.",
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="skilltemplate",
            name="level_scaling",
            field=models.JSONField(
                default=list,
                help_text='[{"damage": 20, "mana_cost": 10}, ...] — index 0 = level 1',
            ),
        ),
        migrations.AddIndex(
            model_name="skilltemplate",
            index=models.Index(fields=["class_restriction"], name="skill_templ_class_r_idx"),
        ),
    ]
