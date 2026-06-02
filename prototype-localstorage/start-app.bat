@echo off
cd /d "%~dp0"
echo PMO Meeting Hub を起動しています...
echo ブラウザで http://127.0.0.1:4173/index.html を開いてください。
echo このウィンドウを閉じるとサーバーは停止します。
"C:\Users\HIROSHI\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 4173 --bind 127.0.0.1
