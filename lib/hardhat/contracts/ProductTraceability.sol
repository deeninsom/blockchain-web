// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

contract ProductTraceability {
    
    // Alamat operator (alamat yang memiliki PRIVATE_KEY di server Anda)
    address public immutable operator;

    // Definisikan Event Types untuk referensi
    // 1: HARVEST 
    // 2: CERTIFICATION 
    // 3: SHIPMENT_PICKED 
    // 5: SHIPMENT_RECEIVED 

    // Event harus mencerminkan data yang ingin dicatat
    event ProductEvent(
        bytes32 indexed batchId,
        address indexed actor,      // Alamat wallet user yang melakukan aksi (Operator Gudang, Petani, dll.)
        uint8 eventType,            // Kode Event
        string ipfsHash,            // Hash data detail event (GPS, Status, Notes)
        uint256 timestamp
    );

    // Mapping untuk menyimpan IPFS Hash terbaru per batchId
    mapping(bytes32 => string) public latestIpfsHashes;

    // Konstruktor: Mengatur alamat deployer sebagai operator backend
    constructor() {
        operator = msg.sender;
    }

    /**
     * Fungsi untuk mencatat event rantai pasok ke blockchain.
     * HANYA boleh dipanggil oleh alamat operator backend (msg.sender).
     * * @param _batchId ID Batch yang dicatat.
     * @param _actorAddress Alamat wallet user yang melakukan kegiatan ini.
     * @param _eventType Tipe event (3 untuk PICKED, 5 untuk RECEIVED).
     * @param _ipfsHash CID data event di IPFS.
     */
    function recordEvent(
        bytes32 _batchId,   
        address _actorAddress,
        uint8 _eventType,
        string memory _ipfsHash
    ) public {
        // GUARDRAIL 1: Hanya operator backend yang dapat mengirim transaksi
        require(msg.sender == operator, "Hanya operator yang dapat mencatat event.");

        // GUARDRAIL 2: Memastikan eventType adalah salah satu kode yang diizinkan (1, 2, 3, atau 5)
        require(_eventType == 1 || _eventType == 2 || _eventType == 3 ||_eventType == 4 || _eventType == 5 || _eventType == 99, 
                "EventType tidak valid. Harus 1, 2, 3, atau 5.");

        // Simpan IPFS Hash terbaru untuk quick lookup
        latestIpfsHashes[_batchId] = _ipfsHash;

        // Emit Event (Pencatatan on-chain)
        emit ProductEvent(
            _batchId,
            _actorAddress, 
            _eventType,
            _ipfsHash,
            block.timestamp
        );
    }

    // Fungsi untuk mendapatkan IPFS Hash terbaru
    function getLatestIpfsHash(bytes32 _batchId) public view returns (string memory) {
        return latestIpfsHashes[_batchId];
    }
}