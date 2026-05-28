from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AccidentIncident',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('incident_id', models.CharField(max_length=80, unique=True)),
                ('title', models.CharField(max_length=160)),
                ('description', models.TextField()),
                ('severity', models.PositiveSmallIntegerField(default=3)),
                ('incident_type', models.CharField(max_length=80)),
                ('occurred_at', models.DateTimeField()),
                ('lat', models.FloatField(default=37.7749)),
                ('lng', models.FloatField(default=-122.4194)),
                ('location', models.CharField(default='Unknown location', max_length=255)),
                ('status', models.CharField(default='active', max_length=40)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-occurred_at', '-created_at'],
            },
        ),
    ]
