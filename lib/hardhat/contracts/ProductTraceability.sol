// contracts/ProductTraceability.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ----------------------------------------------------
// Event yang akan di-emit (Langkah 6 & 7)
// ----------------------------------------------------
event ProductEvent(
    bytes32 indexed batchId,
    address indexed actor,
    uint8 eventType, // e.g., 1=Harvest, 2=Collection, 3=Processing
    string ipfsHash,
    uint256 timestamp
);

contract ProductTraceability {
    // Menyimpan hash IPFS terbaru untuk setiap batchId (digunakan untuk verifikasi)
    mapping(bytes32 => string) public latestIpfsHashes;

    // Fungsi utama untuk mencatat setiap kejadian (Harvest, Collection, dll.)
    // Dipanggil oleh Backend API (msg.sender adalah Wallet Backend)
    function recordEvent(
        bytes32 _batchId,
        uint8 _eventType,
        string memory _ipfsHash
    ) public {
        // 1. Simpan Hash IPFS terbaru
        latestIpfsHashes[_batchId] = _ipfsHash;

        // 2. Emit Event (Kunci untuk Event Listener - Langkah 7)
        emit ProductEvent(
            _batchId,
            msg.sender, // Aktor (wallet backend) yang mengirim transaksi
            _eventType,
            _ipfsHash,
            block.timestamp
        );
    }

    // Fungsi Read-Only untuk Verifikasi On-Chain (Langkah 9)
    function getLatestIpfsHash(bytes32 _batchId) public view returns (string memory) {
        return latestIpfsHashes[_batchId];
    }
}