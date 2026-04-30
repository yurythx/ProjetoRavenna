@echo off
echo ========================================
echo   Projeto Ravenna - Setup Script
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/5] Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [4/5] Generating RSA keys (if needed)...
python keys\generate_keys.py

echo [5/5] Creating .env file (if needed)...
if not exist .env (
    copy .env.example .env
    echo NOTE: Please edit .env and set your DJANGO_SECRET_KEY
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit .env and set DJANGO_SECRET_KEY
echo   2. Run: python manage.py migrate
echo   3. Run: python manage.py createsuperuser
echo   4. Run: python manage.py runserver
echo.
pause
