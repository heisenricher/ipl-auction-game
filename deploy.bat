@echo off
title IPL Mega Auction Game - Vercel Deployer
echo ========================================================
echo   IPL Mega Auction Game - Vercel Deployment Helper
echo ========================================================
echo.
echo Before deploying:
echo 1. Ensure you have run the database setup script (supabase_setup.sql)
echo    in your Supabase SQL editor.
echo 2. Grab your Supabase Project URL and Anon Key.
echo.
echo Press any key to start Vercel login...
pause > nul
echo.

set PATH=C:\Program Files\nodejs;%PATH%

echo [1/3] Logging in to Vercel...
echo A browser window will open. Please authenticate.
call npx vercel login
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Vercel login failed or cancelled.
  goto end
)
echo.

echo [2/3] Setting up Vercel project...
echo When prompted, select options to link/create a new project.
echo (Suggested project name: ipl-auction-game)
echo.
call npx vercel
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Initial Vercel setup failed.
  goto end
)
echo.

echo [3/3] Deploying to Production...
call npx vercel --prod
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Vercel production deployment failed.
  goto end
)
echo.
echo ========================================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================================
echo.
echo NEXT STEP:
echo 1. Go to your Vercel Dashboard (https://vercel.com).
echo 2. Open your new project -> Settings -> Environment Variables.
echo 3. Add these two environment variables:
echo    - VITE_SUPABASE_URL = (your Supabase URL)
echo    - VITE_SUPABASE_ANON_KEY = (your Supabase Anon Key)
echo 4. Trigger a Redeploy in the Vercel dashboard to apply the keys.
echo.

:end
pause
