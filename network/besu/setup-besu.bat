@echo off
REM ============================================================
REM Setup Script: Besu IBFT 2.0 Multi-Node Network (Windows)
REM Generates node keys for 4 validator nodes
REM Run this ONCE before first docker-compose up
REM ============================================================

echo ========================================
echo  Besu IBFT 2.0 Network Setup (Windows)
echo ========================================
echo.

set SCRIPT_DIR=%~dp0

REM Create key directories
echo Creating key directories...
mkdir "%SCRIPT_DIR%keys\node1" 2>nul
mkdir "%SCRIPT_DIR%keys\node2" 2>nul
mkdir "%SCRIPT_DIR%keys\node3" 2>nul
mkdir "%SCRIPT_DIR%keys\node4" 2>nul

REM Create data directories  
mkdir "%SCRIPT_DIR%data\node1" 2>nul
mkdir "%SCRIPT_DIR%data\node2" 2>nul
mkdir "%SCRIPT_DIR%data\node3" 2>nul
mkdir "%SCRIPT_DIR%data\node4" 2>nul

REM Generate node keys using Besu docker image
echo.
echo Generating node keys...
for /L %%i in (1,1,4) do (
    echo   Generating key for Node %%i...
    docker run --rm -v "%SCRIPT_DIR%keys/node%%i:/keys" hyperledger/besu:latest --data-path=/keys public-key export --to=/keys/key.pub
    echo   Node %%i key generated
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Run: docker-compose up -d
echo   2. Check IBFT validators:
echo      curl http://localhost:8545 -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"ibft_getValidatorsByBlockNumber\",\"params\":[\"latest\"],\"id\":1}"
echo   3. Deploy smart contract to the IBFT network
echo.
pause
