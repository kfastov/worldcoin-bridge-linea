//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface ICrossDomainOwnableLinea {
    /// @notice Allows for ownership to be transferred with specifying the locality.
    /// @param _owner   The new owner of the contract.
    /// @param _isLocal Configures the locality of the ownership.
    function transferOwnership(address _owner, bool _isLocal) external;

    /// @notice Sets or updates the messaging service
    /// @param _messageService The new message service address, cannot be empty.
    function setMessagingService(address _messageService) external;
}
