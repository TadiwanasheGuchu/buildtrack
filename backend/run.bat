@echo off
rem Start the BuildTrack API using the project venv (avoids picking up the global Python)
cd /d "%~dp0"
venv\Scripts\python.exe -m uvicorn app.main:app --reload
