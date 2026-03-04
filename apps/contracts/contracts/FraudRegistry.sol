// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FraudRegistry {
    address public owner;

    event FraudReported(
        bytes32 indexed userIdHash,
        bytes32 indexed verificationIdHash,
        bytes32 payloadHash,
        uint256 anchorId,
        uint8 fraudType
    );

    event AnchorSubmitted(
        bytes32 indexed root,
        uint64 batchEnd,
        uint32 schemaVersion
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "FraudRegistry: caller is not the owner");
        _;
    }

    function submitAnchor(bytes32 root, uint64 batchEnd, uint32 schemaVersion) external onlyOwner {
        emit AnchorSubmitted(root, batchEnd, schemaVersion);
    }

    function reportFraud(
        bytes32 userIdHash,
        bytes32 verificationIdHash,
        bytes32 payloadHash,
        uint256 anchorId,
        uint8 fraudType
    ) external onlyOwner {
        emit FraudReported(userIdHash, verificationIdHash, payloadHash, anchorId, fraudType);
    }
}
