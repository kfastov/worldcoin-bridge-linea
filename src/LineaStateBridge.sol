// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// Optimism interface for cross domain messaging

/// @title World ID State Bridge Optimism
/// @author Worldcoin
/// @notice Distributes new World ID Identity Manager roots to the Linea chain
/// @dev This contract lives on Ethereum mainnet and works for Linea
contract LineaStateBridge is Ownable2Step {
    // solhint-disable-next-line no-empty-blocks
    constructor() { }

    // TODO: implement contract logic
    ///////////////////////////////////////////////////////////////////
///                         Linea GAS LIMIT                     ///
///////////////////////////////////////////////////////////////////

/// @notice Sets the gas limit for the propagateRoot method
/// @param _lineaGasLimit The new gas limit for the propagateRoot method
function setGasLimitPropagateRoot(uint32 _lineaGasLimit) external onlyOwner {
    if (_lineaGasLimit <= 0) {
        revert GasLimitZero();
    }
    gasLimitPropagateRoot = _lineaGasLimit;
    emit SetGasLimitPropagateRoot(_lineaGasLimit);
}

/// @notice Sets the gas limit for the setRootHistoryExpiry method
/// @param _lineaGasLimit The new gas limit for the setRootHistoryExpiry method
function setGasLimitSetRootHistoryExpiry(uint32 _lineaGasLimit) external onlyOwner {
    if (_lineaGasLimit <= 0) {
        revert GasLimitZero();
    }
    gasLimitSetRootHistoryExpiry = _lineaGasLimit;
    emit SetGasLimitSetRootHistoryExpiry(_lineaGasLimit);
}

/// @notice Sets the gas limit for the transferOwnership method
/// @param _lineaGasLimit The new gas limit for the transferOwnership method
function setGasLimitTransferOwnership(uint32 _lineaGasLimit) external onlyOwner {
    if (_lineaGasLimit <= 0) {
        revert GasLimitZero();
    }
    gasLimitTransferOwnership = _lineaGasLimit;
    emit SetGasLimitTransferOwnership(_lineaGasLimit);
}
}
