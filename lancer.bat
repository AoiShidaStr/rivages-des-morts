@echo off
rem Lance le serveur du jeu avec la derniere version de GitHub (Windows). Double-clic, ou dans un terminal :
rem   lancer.bat          tunnel gratuit (depuis son PC)
rem   lancer.bat https    Caddy et HTTPS (sur un VPS, avec DOMAINE dans .env)
rem   lancer.bat local    sans tunnel ni HTTPS (reseau local seulement)
rem Il passe sur la branche main, recupere les nouveautes, puis reconstruit l'image si besoin.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=tunnel"
set "PROFIL="
if /i "%MODE%"=="tunnel" set "PROFIL=--profile tunnel"
if /i "%MODE%"=="https" set "PROFIL=--profile https"
if /i not "%MODE%"=="tunnel" if /i not "%MODE%"=="https" if /i not "%MODE%"=="local" (
  echo Mode inconnu : %MODE% ^(tunnel, https ou local^)
  goto fin
)

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker ne repond pas : ouvre Docker Desktop, attends "Engine running", puis relance.
  goto fin
)

for /f "delims=" %%v in ('git log -1 "--format=%%h du %%cd" "--date=format:%%d/%%m/%%Y %%H:%%M"') do echo Version installee : %%v
echo Recherche d'une mise a jour sur GitHub...
git fetch --quiet origin main
if errorlevel 1 (
  echo GitHub ne repond pas : le serveur demarre avec la version installee.
  goto demarrer
)
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCHE=%%b"
if not "%BRANCHE%"=="main" (
  echo Passage de la branche %BRANCHE% a main.
  git checkout --quiet main
  if errorlevel 1 goto fin
)
for /f "delims=" %%a in ('git rev-parse HEAD') do set "ICI=%%a"
for /f "delims=" %%a in ('git rev-parse origin/main') do set "LA=%%a"
if "%ICI%"=="%LA%" (
  echo Deja a jour.
) else (
  echo Nouveautes :
  git log "--format=  - %%s" -n 15 HEAD..origin/main
  git pull --quiet --ff-only origin main
  if errorlevel 1 (
    echo La mise a jour a echoue ^(des fichiers modifies a la main ?^) : rien n'a ete change.
    goto fin
  )
)

:demarrer
for /f "delims=" %%v in ('git log -1 "--format=%%h du %%cd" "--date=format:%%d/%%m/%%Y"') do set "VERSION=%%v"
echo Demarrage de la version %VERSION%...
rem --build ne reconstruit que ce qui a change : sans nouveaute, c'est rapide.
docker compose %PROFIL% up -d --build
if errorlevel 1 goto fin
echo.
echo C'est lance : http://localhost:8080
echo Version servie : http://localhost:8080/sante
echo L'adresse a donner a tes amis s'affiche en haut du menu social ^(touche O^).

:fin
echo.
pause
endlocal
