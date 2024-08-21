// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

// Linea interface for cross domain messaging
import { IMessageService } from "./interfaces/IMessageService.sol";
import { MessageServiceBase } from "./MessageServiceBase.sol";
import { ILineaWorldID } from "./interfaces/ILineaWorldID.sol";
import { IRootHistory } from "world-id-state-bridge/interfaces/IRootHistory.sol";
import { IWorldIDIdentityManager } from "world-id-state-bridge/interfaces/IWorldIDIdentityManager.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ICrossDomainOwnableLinea } from "./interfaces/ICrossDomainOwnableLinea.sol";

/// @title World ID State Bridge Linea
/// @author Worldcoin & James Harrison
/// @notice Distributes new World ID Identity Manager roots to an Linea Stack network
/// @dev This contract lives on Ethereum mainnet and works for Linea.
contract LineaStateBridge is Ownable2Step {
    ///////////////////////////////////////////////////////////////////
    ///                           STORAGE                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice The address of the LinearWorldID contract on any Linea Stack chain
    address public immutable lineaWorldIDAddress;

    /// @notice address for Linea Stack chain Ethereum mainnet L1 Message Service contract
    address internal immutable messageServiceAddress;

    /// @notice Ethereum mainnet worldID Address
    address public immutable worldIDAddress;

    /// @notice Amount of gas purchased on the Linea Stack chain for propagateRoot
    uint32 internal _gasLimitPropagateRoot;

    /// @notice Amount of gas purchased on the OLinea Stack chain for SetRootHistoryExpiry
    uint32 internal _gasLimitSetRootHistoryExpiry;

    /// @notice Amount of gas purchased on the Linea Stack chain for transferOwnershipLinea
    uint32 internal _gasLimitTransferOwnership;

    /// @notice The default gas limit amount to buy on an Linea stack chain to do simple transactions
    /// @dev For estimation see https://github.com/kfastov/worldcoin-bridge-linea/pull/9
    uint32 public constant DEFAULT_LINEA_GAS_LIMIT = 1_000_000;

    ///////////////////////////////////////////////////////////////////
    ///                            EVENTS                           ///
    ///////////////////////////////////////////////////////////////////
    /// @notice Emitted when the StateBridge changes authorized remote sender address
    /// of the LineaWorldID contract to the WorldID Identity Manager contract
    /// @param previousRemoteAddress The previous authorized remote sender for the LineaWorldID contract
    /// @param remoteAddress The authorized remote sender address, cannot be empty
    event UpdatedRemoteAddressLinea(address indexed previousRemoteAddress, address indexed remoteAddress);

    /// @notice Emitted when the StateBridge changes message service address
    /// of the LineaWorldID contract
    /// @param previousMessageService The previous message service address for the LineaWorldID contract
    /// @param messageService The message service address, cannot be empty.
    event UpdatedMessageServiceLinea(address indexed previousMessageService, address indexed messageService);

    /// @notice Emitted when the StateBridge sends a root to the LineaWorldID contract
    /// @param root The root sent to the LineaWorldID contract on the Linea Stack chain
    event RootPropagated(uint256 root);

    /// @notice Emitted when the StateBridge sets the root history expiry for LineaWorldID
    /// @param rootHistoryExpiry The new root history expiry
    event SetRootHistoryExpiry(uint256 rootHistoryExpiry);

    /// @notice Emitted when the StateBridge sets the gas limit for sendRootLinea
    /// @param _lineaGasLimit The new _lineaGasLimit  for sendRootLinea
    event SetGasLimitPropagateRoot(uint32 _lineaGasLimit);

    /// @notice Emitted when the StateBridge sets the gas limit for SetRootHistoryExpiry
    /// @param _lineaGasLimit The new _lineaGasLimit  for SetRootHistoryExpiry
    event SetGasLimitSetRootHistoryExpiry(uint32 _lineaGasLimit);

    /// @notice Emitted when the StateBridge sets the gas limit for transferOwnershipLinea
    /// @param _lineaGasLimit The new _lineaGasLimit  for transferOwnershipLinea
    event SetGasLimitTransferOwnershipLinea(uint32 _lineaGasLimit);

    ///////////////////////////////////////////////////////////////////
    ///                            ERRORS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Emitted when an attempt is made to renounce ownership.
    error CannotRenounceOwnership();

    /// @notice Emitted when an attempt is made to set the gas limit to zero
    error GasLimitZero();

    /// @notice Emitted when an attempt is made to set an address to zero
    error AddressZero();

    ///////////////////////////////////////////////////////////////////
    ///                         CONSTRUCTOR                         ///
    ///////////////////////////////////////////////////////////////////

    /// @notice constructor
    /// @param _worldIDIdentityManager Deployment address of the WorldID Identity Manager contract
    /// @param _lineaWorldIDAddress Address of the Linea contract that will receive the new root and timestamp
    /// @param _messageService L1 Message Service contract used to communicate with the desired Linea
    /// Stack network
    /// @custom:revert if any of the constructor params addresses are zero
    constructor(address _worldIDIdentityManager, address _lineaWorldIDAddress, address _messageService) {
        if (
            _worldIDIdentityManager == address(0) || _lineaWorldIDAddress == address(0) || _messageService == address(0)
        ) {
            revert AddressZero();
        }

        lineaWorldIDAddress = _lineaWorldIDAddress;
        worldIDAddress = _worldIDIdentityManager;
        messageServiceAddress = _messageService;
        _gasLimitPropagateRoot = DEFAULT_LINEA_GAS_LIMIT;
        _gasLimitSetRootHistoryExpiry = DEFAULT_LINEA_GAS_LIMIT;
        _gasLimitTransferOwnership = DEFAULT_LINEA_GAS_LIMIT;
    }

    ///////////////////////////////////////////////////////////////////
    ///                          PUBLIC API                         ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Sends the latest WorldID Identity Manager root to the ILineaStack.
    /// @dev Calls this method on the L1 Proxy contract to relay roots to the destination Linea Stack chain
    function propagateRoot() external {
        uint256 latestRoot = IWorldIDIdentityManager(worldIDAddress).latestRoot();

        // The `encodeCall` function is strongly typed, so this checks that we are passing the
        // correct data to the Linea messaging service.
        bytes memory message = abi.encodeCall(ILineaWorldID.receiveRoot, (latestRoot));

        IMessageService(messageServiceAddress).sendMessage(
            // Contract address on the Linea Stack Chain
            lineaWorldIDAddress,
            _gasLimitPropagateRoot,
            message
        );

        emit RootPropagated(latestRoot);
    }

    /// @notice Allows for ownership to be transferred with specifying the locality.
    /// @param _owner   The new owner of the contract.
    /// @param _isLocal Configures the locality of the ownership.

    function transferOwnership(address _owner, bool _isLocal) external onlyOwner {
        if (_owner == address(0)) {
            revert AddressZero();
        }

        // Encoding the call to transferOwnership on ICrossDomainOwnableLinea
        bytes memory message = abi.encodeCall(ICrossDomainOwnableLinea.transferOwnership, (_owner, _isLocal));

        // Sending the message to LineaWorldID via IMessageService
        IMessageService(messageServiceAddress).sendMessage(lineaWorldIDAddress, _gasLimitTransferOwnership, message);

        emit UpdatedRemoteAddressLinea(owner(), _owner);
    }

    /// @notice Sets or updates the messaging service
    /// @param _messageService The new message service address, cannot be empty.
    function setMessagingService(address _messageService) public onlyOwner {
        if (_messageService == address(0)) {
            revert AddressZero();
        }

        // Encoding the call to setMessagingService on ICrossDomainOwnableLinea
        bytes memory message = abi.encodeCall(ICrossDomainOwnableLinea.setMessagingService, (_messageService));

        // Sending the message to LineaWorldID via IMessageService
        IMessageService(messageServiceAddress).sendMessage(lineaWorldIDAddress, _gasLimitTransferOwnership, message);

        emit UpdatedMessageServiceLinea(owner(), _messageService);
    }

    /// @notice Adds functionality to the StateBridge to set the root history expiry on LineaWorldID
    /// @param _rootHistoryExpiry new root history expiry
    function setRootHistoryExpiry(uint256 _rootHistoryExpiry) external onlyOwner {
        // The `encodeCall` function is strongly typed, so this checks that we are passing the
        // correct data to the linea bridge.
        bytes memory message = abi.encodeCall(IRootHistory.setRootHistoryExpiry, (_rootHistoryExpiry));

        IMessageService(messageServiceAddress).sendMessage(
            // Contract address on the Linea Stack Chain
            lineaWorldIDAddress,
            _gasLimitSetRootHistoryExpiry,
            message
        );

        emit SetRootHistoryExpiry(_rootHistoryExpiry);
    }

    ///////////////////////////////////////////////////////////////////
    ///                         Linea GAS LIMIT                        ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Sets the gas limit for the propagateRoot method
    /// @param _lineaGasLimit The new gas limit for the propagateRoot method
    function setGasLimitPropagateRoot(uint32 _lineaGasLimit) external onlyOwner {
        if (_lineaGasLimit <= 0) {
            revert GasLimitZero();
        }

        _gasLimitPropagateRoot = _lineaGasLimit;

        emit SetGasLimitPropagateRoot(_lineaGasLimit);
    }

    /// @notice Sets the gas limit for the SetRootHistoryExpiry method
    /// @param _lineaGasLimit The new gas limit for the SetRootHistoryExpiry method
    function setGasLimitSetRootHistoryExpiry(uint32 _lineaGasLimit) external onlyOwner {
        if (_lineaGasLimit <= 0) {
            revert GasLimitZero();
        }

        _gasLimitSetRootHistoryExpiry = _lineaGasLimit;

        emit SetGasLimitSetRootHistoryExpiry(_lineaGasLimit);
    }

    /// @notice Sets the gas limit for the transferOwnershipLinea method
    /// @param _lineaGasLimit The new gas limit for the transferOwnershipLinea method
    function setGasLimitTransferOwnershipOp(uint32 _lineaGasLimit) external onlyOwner {
        if (_lineaGasLimit <= 0) {
            revert GasLimitZero();
        }

        _gasLimitTransferOwnership = _lineaGasLimit;

        emit SetGasLimitTransferOwnershipLinea(_lineaGasLimit);
    }

    ///////////////////////////////////////////////////////////////////
    ///                          OWNERSHIP                          ///
    ///////////////////////////////////////////////////////////////////
    /// @notice Ensures that ownership of WorldID implementations cannot be renounced.
    /// @dev This function is intentionally not `virtual` as we do not want it to be possible to
    ///      renounce ownership for any WorldID implementation.
    /// @dev This function is marked as `onlyOwner` to maintain the access restriction from the base
    ///      contract.
    function renounceOwnership() public view override onlyOwner {
        revert CannotRenounceOwnership();
    }
}
