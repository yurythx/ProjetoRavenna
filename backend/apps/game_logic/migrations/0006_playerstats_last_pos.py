# Generated manually 2026-05-01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game_logic', '0005_playerstats_pvp_kills_pvp_deaths'),
    ]

    operations = [
        migrations.AddField(
            model_name='playerstats',
            name='last_pos_x',
            field=models.IntegerField(default=0, help_text='Last known X position in centimeters'),
        ),
        migrations.AddField(
            model_name='playerstats',
            name='last_pos_y',
            field=models.IntegerField(default=0, help_text='Last known Y position in centimeters'),
        ),
    ]
