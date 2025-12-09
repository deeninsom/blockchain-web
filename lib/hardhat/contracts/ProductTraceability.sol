// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

contract ProductTraceability {
    
    // 1. Definisikan alamat operator (alamat yang memiliki PRIVATE_KEY di server Anda)
    address public immutable operator;

    // Tambahkan konstruktor untuk menginisialisasi operator
    constructor() {
        // Mengatur alamat yang melakukan deployment (msg.sender) sebagai operator
        operator = msg.sender;
    }

    // Event harus mencerminkan data yang ingin dicatat
    event ProductEvent(
        bytes32 indexed batchId,
        address indexed actor,      // Alamat aktor sebenarnya (User)
        uint8 eventType,
        string ipfsHash,
        uint256 timestamp
    );

    // Mapping untuk menyimpan IPFS Hash terbaru per batchId
    mapping(bytes32 => string) public latestIpfsHashes;

    /**
     * Fungsi untuk mencatat event rantai pasok ke blockchain.
     * HANYA boleh dipanggil oleh alamat operator.
     * * @param _batchId ID Batch yang dicatat.
     * @param _actorAddress Alamat wallet user yang melakukan kegiatan ini.
     * @param _eventType Tipe event (e.g., Harvest=1, Shipment=2).
     * @param _ipfsHash CID data event di IPFS.
     */
    function recordEvent(
        bytes32 _batchId,   
        address _actorAddress, // Diubah namanya untuk konsistensi
        uint8 _eventType,
        string memory _ipfsHash
    ) public {
        // 2. KOREKSI: Tambahkan modifikasi akses: Hanya operator yang dapat mengirim transaksi ini
        require(msg.sender == operator, "Hanya operator yang dapat mencatat event.");

        // 3. Simpan IPFS Hash terbaru
        latestIpfsHashes[_batchId] = _ipfsHash;

        // 4. KOREKSI PENTING: Struktur argumen ProductEvent
        // Urutan: batchId, actor, eventType, ipfsHash, timestamp
        emit ProductEvent(
            _batchId,
            _actorAddress, // MENGGUNAKAN parameter _actorAddress, BUKAN msg.sender
            _eventType,
            _ipfsHash,
            block.timestamp
        );
    }

    // Fungsi getLatestIpfsHash tidak perlu diubah, sudah benar.
    function getLatestIpfsHash(bytes32 _batchId) public view returns (string memory) {
        return latestIpfsHashes[_batchId];
    }
}