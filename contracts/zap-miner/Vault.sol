// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import './ZapMaster.sol';

contract Vault {
    bool private approveLocked;

    address public zapToken;
    address private newVault;
    address private zapMaster;
    address[] public accounts;

    mapping(address => uint256) private indexes;
    mapping(address => uint256) private balances;
    mapping(address => bool) private approved;

    uint256 constant private MAX_UINT = 2**256 - 1;

    modifier onlyZapMaster(){
        require(zapMaster != address(0));
        require(msg.sender == zapMaster, "Vault: Only the ZapMaster contract can make this call");
        _;
    }

    modifier onlyVaultOrZapMaster(){
        require(zapMaster != address(0));
        require(msg.sender == zapMaster || approved[msg.sender] || msg.sender == address(this),
                "Vault: Only the ZapMaster contract or an authorized Vault Contract can make this call");
        _;
    }

    event NewZapMasterEvent(address _newZapMasterAddress);

    constructor (address token, address master) {
        zapToken = token;
        zapMaster = master;
        token.call(abi.encodeWithSignature("approve(address,uint256)", master, MAX_UINT));
    }

    function increaseApproval() public returns (bool) {
        (, bytes memory balance) = zapToken.call(abi.encodeWithSignature("allowance(address,address)", address(this), zapMaster));
        uint256 amount = MAX_UINT - toUint256(balance, 0);
        (bool success, ) = zapToken.call(abi.encodeWithSignature("increaseApproval(address,uint256)", zapMaster, amount));
        return success;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
        require(_bytes.length >= _start + 32, "toUint256_outOfBounds");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }

    function deposit(address userAddress, uint256 value) public onlyVaultOrZapMaster {
        require(userAddress != address(0), "The zero address does not own a vault.");
        if (balances[userAddress] == 0){
            indexes[userAddress] = accounts.length;
            accounts.push(userAddress);
        }
        balances[userAddress] = balances[userAddress] + value;
    }

    function withdraw(address userAddress, uint256 value) public onlyVaultOrZapMaster {
        require(userAddress != address(0), "The zero address does not own a vault.");
        require(userBalance(userAddress) >= value, "Your balance is insufficient.");
        if (balances[userAddress] - value == 0) {
            delete accounts[indexes[userAddress]];
            delete indexes[userAddress];
            balances[userAddress] = balances[userAddress] - value;
            delete balances[userAddress];
        } else {
            balances[userAddress] = balances[userAddress] - value;
        }
    }

    function userBalance(address userAddress) public view returns (uint256 balance) {
        return balances[userAddress];
    }

    function getZM() public view returns (address zapMasterAddress) {
        return zapMaster;
    }

    function getZT() public view returns (address zapTokenAddress) {
        return zapToken;
    }

    function setApproval(address oldVault) public onlyZapMaster {
        require(!approveLocked, "Cannot set approval after migration");
        approved[oldVault] = true;
        approveLocked = true;
    }

    function setNewVault(address _newVault) public onlyZapMaster returns (bool success) {
        require(_newVault != address(0), "Cannot set the zero address as the new Vault");
        newVault = _newVault;
        return true;
    }

    function migrateVault() public onlyZapMaster returns (bool success) {
        require(newVault != address(0), "Can't set the zero address as the new Vault");
        require(Vault(newVault).getZM() == zapMaster, "The new vault must share same ZapMaster contract");
        require(Vault(newVault).getZT() == zapToken, "The new vault must share the same ZapToken contract");
        uint256 balance = 0;
        address account = address(0);
        for (uint256 i = 0; i < accounts.length; i++) {
            account = accounts[i];
            if (balances[account] > 0){
                balance = balances[account];
                withdraw(account, balances[accounts[i]]);
                Vault(newVault).deposit(account, balance);
            }
        }
        return true;
    }
}