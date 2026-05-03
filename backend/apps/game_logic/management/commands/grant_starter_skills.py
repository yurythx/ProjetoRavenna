"""
Management command: retroactively grant starter skills to characters
that were created before the skill-grant-on-creation feature was added.

Usage:
    python manage.py grant_starter_skills           # dry run
    python manage.py grant_starter_skills --apply   # actually writes to DB
"""
from django.core.management.base import BaseCommand

from apps.game_logic.models import PlayerSkill, PlayerStats
from apps.game_logic.services import GameLogicService


class Command(BaseCommand):
    help = "Grant starter skills to characters that have a class but no skills."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write changes to the database (default is dry-run).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode  = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(f"[{mode}] Scanning for characters without starter skills...\n")

        candidates = PlayerStats.objects.exclude(character_class="").select_related("owner")
        total_granted = 0

        for stats in candidates:
            user = stats.owner
            has_skills = PlayerSkill.objects.filter(owner=user).exists()
            if has_skills:
                continue

            cls = stats.character_class
            server_ids = GameLogicService._CLASS_STARTER_SKILLS.get(cls, [])
            self.stdout.write(
                f"  {user.username} ({cls}): would grant server_ids={server_ids}"
            )
            if apply:
                granted = GameLogicService.grant_starter_skills(user, cls)
                self.stdout.write(
                    self.style.SUCCESS(f"    → {len(granted)} skill(s) granted")
                )
                total_granted += len(granted)

        if apply:
            self.stdout.write(self.style.SUCCESS(f"\nDone. Total skills granted: {total_granted}"))
        else:
            self.stdout.write("\nDry-run complete. Re-run with --apply to persist changes.")
