//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/// @title Interface for the LineaWorldID contract
/// @author Worldcoin and 0xprinc x James Harrison.
/// @notice Interface for the MessageServiceBase contract for the Linea L2
interface ILineaWorldID {
    ////////////////////////////////////////////////////////////////////////////////
    ///                               ROOT MIRRORING                            ///
    ///////////////////////////////////////////////////////////////////////////////

    /// @notice This function is called by the state bridge contract when it forwards a new root to
    ///         the bridged WorldID.
    ///
    /// @param newRoot The value of the new root.
    ///
    /// @custom:reverts CannotOverwriteRoot If the root already exists in the root history.
    /// @custom:reverts string If the caller is not the owner.
    function receiveRoot(uint256 newRoot) external;
}
