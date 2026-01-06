from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('articles', '0009_articleview_readingsession_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='author',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='accounts.customuser'),
        ),
        migrations.AddField(
            model_name='comment',
            name='guest_name',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name='comment',
            name='guest_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='comment',
            name='guest_phone',
            field=models.CharField(blank=True, help_text='Contato (DDD + número)', max_length=32, null=True),
        ),
    ]
