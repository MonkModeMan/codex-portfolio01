@echo off
setlocal

cd /d "%~dp0"
set "NODE_EXE=C:\Users\HIROSHI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

echo Starting PMO Meeting Hub SQLite app...
echo.
echo URL:
echo http://127.0.0.1:4174/index.html
echo.
echo Keep this window open while using the app.
echo Close this window to stop the server.
echo.

if not exist "%NODE_EXE%" (
  echo Node.js was not found:
  echo %NODE_EXE%
  echo.
  pause
  exit /b 1
)

"%NODE_EXE%" "%~dp0server.js"

echo.
echo Server stopped. Check the message above if there was an error.
pause
endlocal
