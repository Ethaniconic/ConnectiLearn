@echo off
echo Starting Smart Learning AI...
echo.
echo Checking if virtual environment exists...

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting the application...
echo Open your browser at: http://localhost:8000
echo.

python main.py
