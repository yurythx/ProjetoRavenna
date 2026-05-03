import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("game_logic", "0007_playerstats_identity_playeritem_equip_slot"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Party",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("leader", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="led_parties",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "parties", "verbose_name": "Party", "verbose_name_plural": "Parties"},
        ),
        migrations.AddIndex(
            model_name="party",
            index=models.Index(fields=["is_active"], name="parties_is_active_idx"),
        ),
        migrations.AddIndex(
            model_name="party",
            index=models.Index(fields=["leader"], name="parties_leader_idx"),
        ),
        migrations.CreateModel(
            name="PartyMember",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("party", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="memberships",
                    to="game_logic.party",
                )),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="party_memberships",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "party_members", "verbose_name": "Party Member"},
        ),
        migrations.AlterUniqueTogether(
            name="partymember",
            unique_together={("party", "user")},
        ),
    ]
