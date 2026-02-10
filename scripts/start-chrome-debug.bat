@echo off
REM Chrome をリモートデバッグモードで起動（Windows用）

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
set DEBUG_PORT=9222
set USER_DATA_DIR=%TEMP%\chrome-debug-profile

echo ========================================
echo Chrome Debug Mode Launcher
echo ========================================
echo.
echo Debug Port: %DEBUG_PORT%
echo User Data: %USER_DATA_DIR%
echo.

REM 既存のChromeプロセスを終了
taskkill /F /IM chrome.exe >nul 2>&1

REM 2秒待機
timeout /t 2 /nobreak >nul

REM リモートデバッグモードで起動
%CHROME_PATH% ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --remote-debugging-address=0.0.0.0 ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --disable-web-security ^
  --disable-features=IsolateOrigins,site-per-process ^
  http://localhost:3000/sign-in

echo.
echo Chrome started in debug mode
echo Remote debugging: http://localhost:%DEBUG_PORT%
