// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IMessageService } from "linea-contracts/interfaces/IMessageService.sol";

/// @title CrossDomainOwnableLinea
/// @notice This contract extends the OpenZeppelin `Ownable` contract for L2 contracts to be owned
///         by contracts on either L1 or L2. Since Linea can have several messaging services, this
///         contract has an initializer that takes in a messaging service address.
abstract contract CrossDomainOwnableLinea is Ownable {
    IMessageService public messageService;

    /// @notice If true, the contract uses the cross domain _checkOwner function override.
    ///         If false it uses the standard Ownable _checkOwner function.
    bool public isLocal = true;

    /// @notice Emits when ownership of the contract is transferred. Includes the
    ///         isLocal field in addition to the standard `Ownable` OwnershipTransferred event.
    /// @param previousOwner The previous owner of the contract.
    /// @param newOwner      The new owner of the contract.
    /// @param isLocal       Configures the `isLocal` contract variable.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner, bool isLocal);

    /// @notice Emitted when the messaging service is set or updated
    /// @param oldMessageService The old messaging service address.
    /// @param newMessageService The new messaging service address.
    event MessageServiceUpdated(address indexed oldMessageService, address indexed newMessageService);

    /// @notice Emitted when an attempt is made to set an address to zero
    error ZeroAddressNotAllowed();

    /// @notice Emitted when the caller is not the owner
    error CallerIsNotOwner();

    /// @notice Emitted when the caller is not the message service
    error CallerIsNotMessageService();

    /// @notice Allows for ownership to be transferred with specifying the locality.
    /// @param _owner   The new owner of the contract.
    /// @param _isLocal Configures the locality of the ownership.
    function transferOwnership(address _owner, bool _isLocal) external virtual onlyOwner {
        if (_owner == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        address oldOwner = owner();
        _transferOwnership(_owner);
        isLocal = _isLocal;

        emit OwnershipTransferred(oldOwner, _owner, _isLocal);
    }

    /// @notice Sets or updates the messaging service
    /// @param _messageService The new message service address, cannot be empty.
    function setMessagingService(address _messageService) public onlyOwner {
        if (_messageService == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        address oldMessageService = address(messageService);
        messageService = IMessageService(_messageService);

        emit MessageServiceUpdated(oldMessageService, _messageService);
    }

    /// @notice Constructs the CrossDomainOwnableLinea contract
    /// @param _messageService The message service address, cannot be empty.
    constructor(address _messageService) {
        setMessagingService(_messageService);
    }

    /// @notice Overrides the implementation of the `onlyOwner` modifier to check ownership
    ///         based on the `isLocal` flag. For cross-domain ownership, it verifies that
    ///         the message sender (obtained from the Linea message service) is the owner.
    function _checkOwner() internal view override {
        if (isLocal) {
            if (owner() != msg.sender) {
                revert CallerIsNotOwner();
            }
        } else {
            if (msg.sender != address(messageService)) {
                revert CallerIsNotMessageService();
            }
            if (owner() != address(messageService.sender())) {
                revert CallerIsNotOwner();
            }
        }
    }
}
