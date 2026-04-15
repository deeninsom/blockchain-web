@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Deploying Product Traceability Chaincode
echo ========================================
echo.

set CHANNEL_NAME=bosfresh-channel
set CC_NAME=product-traceability
set CC_VERSION=1.0
set CC_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/product-traceability
set CC_LANG=node

set ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bosfresh.com/orderers/orderer.bosfresh.com/msp/tlscacerts/tlsca.bosfresh.com-cert.pem
set PEER_TLS_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bosfresh.com/peers/peer0.org1.bosfresh.com/tls/ca.crt

echo [1/4] Packaging chaincode...
docker exec fabric-cli peer lifecycle chaincode package %CC_NAME%.tar.gz ^
    --path %CC_PATH% ^
    --lang %CC_LANG% ^
    --label %CC_NAME%_%CC_VERSION%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Packaging failed
    pause
    exit /b 1
)

echo.
echo [2/4] Installing chaincode...
docker exec fabric-cli peer lifecycle chaincode install %CC_NAME%.tar.gz

if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Install returned non-zero. Assuming chaincode is already installed.
    echo Proceeding to fetch Package ID...
)

echo.
echo [3/4] Getting Package ID...

for /f "tokens=3" %%i in ('docker exec fabric-cli peer lifecycle chaincode queryinstalled ^| findstr %CC_NAME%') do (
    set PACKAGE_ID=%%i
)
set PACKAGE_ID=!PACKAGE_ID:,=!

echo Package ID: %PACKAGE_ID%

if "%PACKAGE_ID%"=="" (
    echo [ERROR] Package ID not found
    pause
    exit /b 1
)

echo.
echo [4/4] Approving chaincode...

docker exec fabric-cli peer lifecycle chaincode approveformyorg ^
  -o orderer.bosfresh.com:7050 ^
  --ordererTLSHostnameOverride orderer.bosfresh.com ^
  --channelID %CHANNEL_NAME% ^
  --name %CC_NAME% ^
  --version %CC_VERSION% ^
  --package-id %PACKAGE_ID% ^
  --sequence 1 ^
  --tls ^
  --cafile %ORDERER_CA%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Approve failed
    pause
    exit /b 1
)

echo.
echo [5/5] Committing chaincode...

docker exec fabric-cli peer lifecycle chaincode commit ^
  -o orderer.bosfresh.com:7050 ^
  --ordererTLSHostnameOverride orderer.bosfresh.com ^
  --channelID %CHANNEL_NAME% ^
  --name %CC_NAME% ^
  --version %CC_VERSION% ^
  --sequence 1 ^
  --tls ^
  --cafile %ORDERER_CA% ^
  --peerAddresses peer0.org1.bosfresh.com:7051 ^
  --tlsRootCertFiles %PEER_TLS_CA% ^
  --peerAddresses peer1.org1.bosfresh.com:9051 ^
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bosfresh.com/peers/peer1.org1.bosfresh.com/tls/ca.crt


if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Commit failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Chaincode Deployed Successfully!
echo ========================================
echo.

echo Verifying...
docker exec fabric-cli peer lifecycle chaincode querycommitted -C %CHANNEL_NAME%

echo.
echo Test invoke:
echo docker exec fabric-cli peer chaincode invoke ^
echo   -o orderer.bosfresh.com:7050 ^
echo   --tls --cafile %ORDERER_CA% ^
echo   -C %CHANNEL_NAME% ^
echo   -n %CC_NAME% ^
echo   -c "{\"function\":\"benchmarkWrite\",\"Args\":[\"test1\",\"hello\"]}"

pause