"""Script para criar superusuário."""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.accounts.models import User

username = (os.environ.get("SUPERUSER_USERNAME") or "").strip()
email = (os.environ.get("SUPERUSER_EMAIL") or "").strip()
password = os.environ.get("SUPERUSER_PASSWORD") or ""

if not username or not email or not password:
    sys.stderr.write(
        "Missing env vars. Set SUPERUSER_USERNAME, SUPERUSER_EMAIL and SUPERUSER_PASSWORD.\n"
    )
    raise SystemExit(2)

user = User.objects.filter(username__iexact=username).first()
if user:
    sys.stdout.write("Superuser already exists.\n")
    raise SystemExit(0)

User.objects.create_superuser(username=username, email=email, password=password)
sys.stdout.write("Superuser created.\n")
