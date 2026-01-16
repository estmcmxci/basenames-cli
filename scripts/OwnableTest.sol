// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title OwnableTest
/// @notice A simple contract that implements ERC173 (Ownable) for testing reverse resolution
contract OwnableTest {
    address private _owner;
    uint256 public value;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function set(uint256 _value) public {
        value = _value;
    }

    function transferOwnership(address newOwner) public {
        require(msg.sender == _owner, "Not owner");
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}
