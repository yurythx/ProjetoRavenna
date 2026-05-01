from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game_logic", "0004_questtemplate"),
    ]

    operations = [
        migrations.AddField(
            model_name="playerstats",
            name="pvp_kills",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="playerstats",
            name="pvp_deaths",
            field=models.IntegerField(default=0),
        ),
    ]
