// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/// @custom:security-contact support@ownly.io
contract Solitaire is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter counter;

    address validator;

    struct Record {
        address player;
        uint index;
        uint moves;
        uint duration;
    }

    mapping(uint => Record) idToRecord;
    mapping(address => uint) totalRecords;

    event RecordAdded (
        address indexed player,
        uint indexed index,
        uint moves,
        uint duration
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyOwner
    override
    {}

    function addRecord(uint moves, uint duration, bytes memory signature) public virtual {
        uint id = counter.current();
        counter.increment();

        uint index = totalRecords[msg.sender];

        require(verify(msg.sender, index, moves, duration, signature) == true, "Signature is invalid.");

        idToRecord[id] = Record(
            msg.sender,
            index,
            moves,
            duration
        );

        totalRecords[msg.sender] = index + 1;

        emit RecordAdded(
            msg.sender,
            index,
            moves,
            duration
        );
    }

    function getRecord(uint id) public view virtual returns (Record memory) {
        return idToRecord[id];
    }

    function getPlayerTotalRecords(address player) public view virtual returns (uint) {
        return totalRecords[player];
    }

    function getTotalRecords() public view virtual returns (uint) {
        return counter.current();
    }

    function setValidator(address _validator) public onlyOwner virtual {
        validator = _validator;
    }

    function getValidator() public view virtual returns (address) {
        return validator;
    }

    function getMessageHash(address player, uint index, uint moves, uint duration) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(player, index, moves, duration));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure virtual returns (bytes32) {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
        keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
    }

    function verify(address player, uint index, uint moves, uint duration, bytes memory signature) public view virtual returns (bool) {
        bytes32 messageHash = getMessageHash(player, index, moves, duration);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == validator;
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure virtual returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure virtual returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
        /*
        First 32 bytes stores the length of the signature

        add(sig, 32) = pointer of sig + 32
        effectively, skips first 32 bytes of signature

        mload(p) loads next 32 bytes starting at the memory address p into memory
        */

        // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
        // second 32 bytes
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    function version() pure public virtual returns (string memory) {
        return "v1";
    }
}