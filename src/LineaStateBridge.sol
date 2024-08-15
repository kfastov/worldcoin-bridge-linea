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
/// @notice Distributes new World ID Identity Manager roots to Linea
/// @dev This contract lives on Ethereum mainnet and works for Linea.
contract LineaStateBridge is Ownable2Step {
    ///////////////////////////////////////////////////////////////////
    ///                           STORAGE                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice The address of the LinearWorldID contract Linea
    address public immutable lineaWorldIDAddress;

    /// @notice Address of the Linea Message Service contract on L1 (Ethereum)
    address internal immutable messageServiceAddress;

    /// @notice Ethereum mainnet worldID Address
    address public immutable worldIDAddress;

    /// @notice Amount of fee on Linea for propagateRoot
    uint256 internal _feePropagateRoot;

    /// @notice Amount of fee on Linea for SetRootHistoryExpiry
    uint256 internal _feeSetRootHistoryExpiry;

    /// @notice Amount of fee on Linea for transferOwnershipLinea
    uint256 internal _feeTransferOwnership;

    /// @notice Amount of fee on Linea for setMessagingService
    uint256 internal _feeSetMessagingService;

    /// @notice The default fee for Linea transactions.
    /// Setting this to 0 means that messages will have to be claimed manually on L2
    uint256 public constant DEFAULT_LINEA_FEE = 0;

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
    /// @param root The root sent to the LineaWorldID contract on Linea
    event RootPropagated(uint256 root);

    /// @notice Emitted when the StateBridge sets the root history expiry for LineaWorldID
    /// @param rootHistoryExpiry The new root history expiry
    event SetRootHistoryExpiry(uint256 rootHistoryExpiry);

    /// @notice Emitted when the StateBridge sets the fee for propagateRoot
    /// @param _lineaFee The new fee for propagateRoot
    event SetFeePropagateRoot(uint256 _lineaFee);

    /// @notice Emitted when the StateBridge sets the fee for SetRootHistoryExpiry
    /// @param _lineaFee The new fee for SetRootHistoryExpiry
    event SetFeeSetRootHistoryExpiry(uint256 _lineaFee);

    /// @notice Emitted when the StateBridge sets the fee for transferOwnershipLinea
    /// @param _lineaFee The new fee for transferOwnershipLinea
    event SetFeeTransferOwnershipLinea(uint256 _lineaFee);

    ///////////////////////////////////////////////////////////////////
    ///                            ERRORS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Emitted when an attempt is made to renounce ownership.
    error CannotRenounceOwnership();

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
        _feePropagateRoot = DEFAULT_LINEA_FEE;
        _feeSetRootHistoryExpiry = DEFAULT_LINEA_FEE;
        _feeTransferOwnership = DEFAULT_LINEA_FEE;
        _feeSetMessagingService = DEFAULT_LINEA_FEE;
    }

    ///////////////////////////////////////////////////////////////////
    ///                          PUBLIC API                         ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Sends the latest WorldID Identity Manager root to the ILineaStack.
    /// @dev Calls this method on the L1 Proxy contract to relay roots to Linea
    function propagateRoot() external payable {
        uint256 latestRoot = IWorldIDIdentityManager(worldIDAddress).latestRoot();

        // The `encodeCall` function is strongly typed, so this checks that we are passing the
        // correct data to the Linea messaging service.
        bytes memory message = abi.encodeCall(ILineaWorldID.receiveRoot, (latestRoot));

        IMessageService(messageServiceAddress).sendMessage{value: msg.value}(
            // Contract address on Linea
            lineaWorldIDAddress,
            _feePropagateRoot,
            message
        );

        emit RootPropagated(latestRoot);
    }

    /// @notice Allows for ownership to be transferred with specifying the locality.
    /// @param _owner   The new owner of the contract.
    /// @param _isLocal Configures the locality of the ownership.

    function transferOwnership(address _owner, bool _isLocal) external onlyOwner payable {
        if (_owner == address(0)) {
            revert AddressZero();
        }

        // Encoding the call to transferOwnership on ICrossDomainOwnableLinea
        bytes memory message = abi.encodeCall(ICrossDomainOwnableLinea.transferOwnership, (_owner, _isLocal));

        // Sending the message to LineaWorldID via IMessageService
        IMessageService(messageServiceAddress).sendMessage{value: msg.value}(
            lineaWorldIDAddress,
            _feeTransferOwnership,
            message
        );

        emit UpdatedRemoteAddressLinea(owner(), _owner);
    }

    /// @notice Sets or updates the messaging service
    /// @param _messageService The new message service address, cannot be empty.
    function setMessagingService(address _messageService) public onlyOwner payable {
        if (_messageService == address(0)) {
            revert AddressZero();
        }

        // Encoding the call to setMessagingService on ICrossDomainOwnableLinea
        bytes memory message = abi.encodeCall(ICrossDomainOwnableLinea.setMessagingService, (_messageService));

        // Sending the message to LineaWorldID via IMessageService
        IMessageService(messageServiceAddress).sendMessage{value: msg.value}(
            lineaWorldIDAddress,
            _feeSetMessagingService,
            message
        );

        emit UpdatedMessageServiceLinea(owner(), _messageService);
    }

    /// @notice Adds functionality to the StateBridge to set the root history expiry on LineaWorldID
    /// @param _rootHistoryExpiry new root history expiry
    function setRootHistoryExpiry(uint256 _rootHistoryExpiry) external onlyOwner payable {
        // The `encodeCall` function is strongly typed, so this checks that we are passing the
        // correct data to the linea bridge.
        bytes memory message = abi.encodeCall(IRootHistory.setRootHistoryExpiry, (_rootHistoryExpiry));

        IMessageService(messageServiceAddress).sendMessage{value: msg.value}(
            // Contract address on Linea
            lineaWorldIDAddress,
            _feeSetRootHistoryExpiry,
            message
        );

        emit SetRootHistoryExpiry(_rootHistoryExpiry);
    }

    ///////////////////////////////////////////////////////////////////
    ///                          Linea Fee                          ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Sets the fee for the propagateRoot method
    /// @param _lineaFee The new fee for the propagateRoot method
    function setFeePropagateRoot(uint32 _lineaFee) external onlyOwner {
        _feePropagateRoot = _lineaFee;
        emit SetFeePropagateRoot(_lineaFee);
    }

    /// @notice Sets the fee for the SetRootHistoryExpiry method
    /// @param _lineaFee The new fee for the SetRootHistoryExpiry method
    function setFeeSetRootHistoryExpiry(uint32 _lineaFee) external onlyOwner {
        _feeSetRootHistoryExpiry = _lineaFee;
        emit SetFeeSetRootHistoryExpiry(_lineaFee);
    }

    /// @notice Sets the fee for the transferOwnershipLinea method
    /// @param _lineaFee The new fee for the transferOwnershipLinea method
    function setFeeTransferOwnershipLinea(uint32 _lineaFee) external onlyOwner {
        _feeTransferOwnership = _lineaFee;

        emit SetFeeTransferOwnershipLinea(_lineaFee);
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
