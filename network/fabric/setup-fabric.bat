@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Hyperledger Fabric Network Setup
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"
set FABRIC_VERSION=2.5
set CA_VERSION=1.5
set CHANNEL_NAME=bosfresh-channel

REM ============================================================
REM [0] Clean up previous state
REM ============================================================
echo [0] Cleaning up previous state...
docker-compose down -v 2>nul
if exist "%SCRIPT_DIR%crypto-config" rmdir /s /q "%SCRIPT_DIR%crypto-config"
if exist "%SCRIPT_DIR%channel-artifacts" rmdir /s /q "%SCRIPT_DIR%channel-artifacts"
echo      Cleaned

REM ============================================================
REM [1/6] Generate crypto material
REM ============================================================
echo [1/6] Generating crypto material...
docker run --rm -v "%SCRIPT_DIR%:/fabric" -w /fabric ^
    hyperledger/fabric-tools:%FABRIC_VERSION% ^
    cryptogen generate --config=./crypto-config.yaml --output=./crypto-config
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate crypto material
    pause
    exit /b 1
)
echo      Crypto material generated

REM ============================================================
REM [2/6] Create channel artifacts directory
REM ============================================================
echo.
echo [2/6] Creating channel artifacts directory...
mkdir "%SCRIPT_DIR%channel-artifacts" 2>nul

REM ============================================================
REM [3/6] Generate genesis block for the APPLICATION channel
REM       (No system channel needed with osnadmin)
REM ============================================================
echo.
echo [3/6] Generating channel genesis block...
docker run --rm -v "%SCRIPT_DIR%:/fabric" -w /fabric ^
    -e FABRIC_CFG_PATH=/fabric ^
    hyperledger/fabric-tools:%FABRIC_VERSION% ^
    configtxgen -profile BosFreshChannel -outputBlock ./channel-artifacts/bosfresh-channel.block -channelID %CHANNEL_NAME%
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate channel genesis block
    pause
    exit /b 1
)
echo      Channel genesis block created

REM ============================================================
REM [4/6] Start Fabric network
REM ============================================================
echo.
echo [4/6] Starting Fabric network...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start network
    pause
    exit /b 1
)

echo.
echo Waiting for network to start (10s)...
ping 127.0.0.1 -n 11 > nul

REM ============================================================
REM [5/6] Join orderer to channel via osnadmin
REM ============================================================
echo.
echo [5/6] Joining orderer to channel via osnadmin...

set ORDERER_TLS_DIR=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bosfresh.com/orderers/orderer.bosfresh.com/tls
set ORDERER_ADMIN_TLS_DIR=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bosfresh.com/users/Admin@bosfresh.com/tls

docker exec fabric-cli osnadmin channel join ^
    --channelID %CHANNEL_NAME% ^
    --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/bosfresh-channel.block ^
    -o orderer.bosfresh.com:7053 ^
    --ca-file %ORDERER_TLS_DIR%/ca.crt ^
    --client-cert %ORDERER_TLS_DIR%/server.crt ^
    --client-key %ORDERER_TLS_DIR%/server.key

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to join orderer to channel
    pause
    exit /b 1
)
echo      Orderer joined channel

echo.
echo Waiting for orderer to activate channel (5s)...
ping 127.0.0.1 -n 6 > nul

REM ============================================================
REM [6/6] Join peers to channel
REM ============================================================
echo.
echo [6/6] Joining peers to channel...

set TLS_FLAGS=--tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bosfresh.com/orderers/orderer.bosfresh.com/msp/tlscacerts/tlsca.bosfresh.com-cert.pem

REM Fetch the channel block
docker exec fabric-cli peer channel fetch 0 ^
    /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/%CHANNEL_NAME%.block ^
    -o orderer.bosfresh.com:7050 %TLS_FLAGS% ^
    -c %CHANNEL_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to fetch channel block
    pause
    exit /b 1
)

REM Join peer0
docker exec fabric-cli peer channel join ^
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/%CHANNEL_NAME%.block

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to join peer0 to channel
    pause
    exit /b 1
)
echo      peer0 joined channel

REM Join peer1 (switch CORE_PEER_ADDRESS)
docker exec ^
    -e CORE_PEER_ADDRESS=peer1.org1.bosfresh.com:9051 ^
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bosfresh.com/peers/peer1.org1.bosfresh.com/tls/ca.crt ^
    fabric-cli peer channel join ^
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/%CHANNEL_NAME%.block

if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to join peer1 to channel (non-critical)
)
echo      peer1 joined channel

echo.
echo ========================================
echo  Fabric Network is Running!
echo ========================================
echo.
echo Nodes:
echo   - Orderer: localhost:7050 (admin: 7053)
echo   - Peer0:   localhost:7051
echo   - Peer1:   localhost:9051
echo   - CA:      localhost:7054
echo.
echo Next steps:
echo   1. Deploy chaincode: deploy-chaincode.bat
echo   2. Run benchmark from the web UI
echo.
pause
