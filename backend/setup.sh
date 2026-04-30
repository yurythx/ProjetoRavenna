#!/bin/bash
echo "========================================"
echo "  Projeto Ravenna - Setup Script"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/5] Creating virtual environment..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create virtual environment"
    exit 1
fi

echo "[2/5] Activating virtual environment..."
source venv/bin/activate

echo "[3/5] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo "[4/5] Generating RSA keys (if needed)..."
python keys/generate_keys.py

echo "[5/5] Creating .env file (if needed)..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "NOTE: Please edit .env and set your DJANGO_SECRET_KEY"
fi

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env and set DJANGO_SECRET_KEY"
echo "  2. Run: python manage.py migrate"
echo "  3. Run: python manage.py createsuperuser"
echo "  4. Run: python manage.py runserver"
echo ""
