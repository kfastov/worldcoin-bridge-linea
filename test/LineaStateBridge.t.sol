pragma solidity ^0.8.15;

import { LineaStateBridge } from "../src/LineaStateBridge.sol";
import { MockWorldIDIdentityManager } from "../src/mocks/MockWorldIDIdentityManager.sol";
import { MockBridgedWorldID } from "../src/mocks/MockBridgedWorldID.sol";
import { MockMessageService } from "../src/mocks/MockMessageService.sol";

import { PRBTest } from "@prb/test/PRBTest.sol";
import { StdCheats } from "forge-std/StdCheats.sol";

/// @title Linea State Bridge Test
/// @author Worldcoin & IkemHood
/// @notice A test contract for LineaStateBridge.sol
contract LineaStateBridgeTest is PRBTest, StdCheats {
    uint256 public mainnetFork;
    string private mainnetRPCUrl = vm.envString("MAINNET_RPC_URL");

    LineaStateBridge public lineaStateBridge;
    MockWorldIDIdentityManager public mockWorldID;

    uint32 public lineaGasLimit;

    address public mockWorldIDAddress;

    address public owner;

    MockBridgedWorldID public mockLineaWorldID;

    /// @notice The address of the LineaWorldID contract
    address public lineaWorldIDAddress;

    MockMessageService public lineaCrossDomainMessenger;

    /// @notice address for Linea Stack chain Ethereum mainnet L1CrossDomainMessenger contract
    address public lineaCrossDomainMessengerAddress;

    uint256 public sampleRoot;

    ///////////////////////////////////////////////////////////////////
    ///                            EVENTS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Emitted when the ownership transfer of lineaStateBridge is started (OZ Ownable2Step)
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

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

    /// @notice Emitted when the message service is set or updated
    /// @param oldMessageService The old message service address.
    /// @param newMessageService The new message service address.
    event MessageServiceUpdated(address indexed oldMessageService, address indexed newMessageService);

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

    /// @notice Emitted when the StateBridge sets the fee for setMessageService
    /// @param _lineaFee The new fee for setMessageService
    event SetFeeSetMessageService(uint256 _lineaFee);

    /// @notice Emitted when an attempt is made to renounce ownership.
    error CannotRenounceOwnership();

    /// @notice Emitted when an attempt is made to set an address to zero
    error AddressZero();

    function setUp() public {
        mainnetFork = vm.createFork(mainnetRPCUrl);
        vm.selectFork(mainnetFork);

        // Deploy mock contracts
        sampleRoot = uint256(0x111);
        mockWorldID = new MockWorldIDIdentityManager(sampleRoot);
        mockWorldIDAddress = address(mockWorldID);

        mockLineaWorldID = new MockBridgedWorldID(32);
        lineaWorldIDAddress = address(mockLineaWorldID);

        lineaCrossDomainMessenger = new MockMessageService();
        lineaCrossDomainMessengerAddress = address(lineaCrossDomainMessenger);

        // Deploy LineaStateBridge
        lineaStateBridge =
            new LineaStateBridge(mockWorldIDAddress, lineaWorldIDAddress, lineaCrossDomainMessengerAddress);

        owner = lineaStateBridge.owner();
    }

    ///////////////////////////////////////////////////////////////////
    ///                           SUCCEEDS                          ///
    ///////////////////////////////////////////////////////////////////

    /// @notice select a specific fork
    function test_canSelectFork_succeeds() public {
        // select the fork
        vm.selectFork(mainnetFork);
        assertEq(vm.activeFork(), mainnetFork);
    }

    function test_propagateRoot_suceeds() public {
        vm.expectEmit(true, true, true, true);
        emit RootPropagated(sampleRoot);

        lineaStateBridge.propagateRoot();

        // Bridging is not emulated
    }

    /// @notice Tests that the owner of the StateBridge contract can transfer ownership
    /// using Ownable2Step transferOwnership
    /// @param newOwner the new owner of the contract
    function test_owner_transferOwnership_succeeds(address newOwner) public {
        vm.assume(newOwner != address(0));

        vm.expectEmit(true, true, true, true);

        // OpenZeppelin Ownable2Step transferOwnershipStarted event
        emit OwnershipTransferStarted(owner, newOwner);

        vm.prank(owner);
        lineaStateBridge.transferOwnership(newOwner);

        vm.prank(newOwner);
        lineaStateBridge.acceptOwnership();

        assertEq(lineaStateBridge.owner(), newOwner);
    }

    /// @notice tests whether the StateBridge contract can transfer ownership of the lineaWorldID contract
    /// @param newOwner The new owner of the lineaWorldID contract (foundry fuzz)
    /// @param isLocal Whether the ownership transfer is local (Linea EOA/contract) or an Ethereum EOA or contract
    function test_owner_transferOwnershipLinea_succeeds(address newOwner, bool isLocal) public {
        vm.assume(newOwner != address(0));
        vm.expectEmit(true, true, true, true);

        emit UpdatedRemoteAddressLinea(owner, newOwner);

        vm.prank(owner);
        lineaStateBridge.transferOwnershipLinea(newOwner, isLocal);
    }

    /// @notice tests whether the StateBridge contract can updates the message service
    /// @param _messageService The new message service address
    function test_owner_setMessageService_succeeds(address _messageService) public {
        vm.assume(_messageService != address(0));
        vm.expectEmit(true, true, true, true);

        emit UpdatedMessageServiceLinea(owner, _messageService);

        vm.prank(owner);
        lineaStateBridge.setMessageService(_messageService);
    }

    /// @notice tests whether the StateBridge contract can set root history expiry on Linea
    /// @param _rootHistoryExpiry The new root history expiry for LineaWorldID
    function test_owner_setRootHistoryExpiry_succeeds(uint256 _rootHistoryExpiry) public {
        vm.expectEmit(true, true, true, true);
        emit SetRootHistoryExpiry(_rootHistoryExpiry);

        vm.prank(owner);
        lineaStateBridge.setRootHistoryExpiry(_rootHistoryExpiry);
    }

    /// @notice tests whether the StateBridge contract can set fee for propagateRoot
    /// @param _lineaFee The new lineaFee for SetRootHistoryExpiry
    function test_owner_setFeePropagateRoot_succeeds(uint32 _lineaFee) public {
        vm.assume(_lineaFee != 0);

        vm.expectEmit(true, true, true, true);

        emit SetFeePropagateRoot(_lineaFee);

        vm.prank(owner);
        lineaStateBridge.setFeePropagateRoot(_lineaFee);
    }

    /// @notice tests whether the StateBridge contract can set fee for SetRootHistoryExpiry
    /// @param _lineaFee The new lineaFee for SetRootHistoryExpiry
    function test_owner_setFeeSetRootHistoryExpiry_succeeds(uint32 _lineaFee) public {
        vm.assume(_lineaFee != 0);

        vm.expectEmit(true, true, true, true);

        emit SetFeeSetRootHistoryExpiry(_lineaFee);

        vm.prank(owner);
        lineaStateBridge.setFeeSetRootHistoryExpiry(_lineaFee);
    }

    /// @notice tests whether the StateBridge contract can set fee for SetRootHistoryExpiry
    /// @param _lineaFee The new lineaFee for transferOwnershipLinea
    function test_owner_setFeeTransferOwnershipLinea_succeeds(uint32 _lineaFee) public {
        vm.assume(_lineaFee != 0);

        vm.expectEmit(true, true, true, true);

        emit SetFeeTransferOwnershipLinea(_lineaFee);

        vm.prank(owner);
        lineaStateBridge.setFeeTransferOwnershipLinea(_lineaFee);
    }

    /// @notice tests whether the StateBridge contract can set fee for SetRootHistoryExpiry
    /// @param _lineaFee The new lineaFee for setMessageService
    function test_owner_setFeeSetMessageService_succeeds(uint32 _lineaFee) public {
        vm.assume(_lineaFee != 0);

        vm.expectEmit(true, true, true, true);

        emit SetFeeSetMessageService(_lineaFee);

        vm.prank(owner);
        lineaStateBridge.setFeeSetMessageService(_lineaFee);
    }

    ///////////////////////////////////////////////////////////////////
    ///                           REVERTS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Tests that the StateBridge constructor params can't be set to the zero address
    function test_cannotInitializeConstructorWithZeroAddresses_reverts() public {
        vm.expectRevert(AddressZero.selector);
        lineaStateBridge = new LineaStateBridge(address(0), lineaWorldIDAddress, lineaCrossDomainMessengerAddress);

        vm.expectRevert(AddressZero.selector);
        lineaStateBridge = new LineaStateBridge(mockWorldIDAddress, address(0), lineaCrossDomainMessengerAddress);

        vm.expectRevert(AddressZero.selector);
        lineaStateBridge = new LineaStateBridge(mockWorldIDAddress, lineaWorldIDAddress, address(0));
    }

    /// @notice tests that the StateBridge contract's ownership can't be changed by a non-owner
    /// @param newOwner The new owner of the StateBridge contract (foundry fuzz)
    /// @param nonOwner An address that is not the owner of the StateBridge contract
    function test_notOwner_transferOwnership_reverts(address nonOwner, address newOwner) public {
        vm.assume(nonOwner != owner && nonOwner != address(0) && newOwner != address(0));

        vm.expectRevert("Ownable: caller is not the owner");

        vm.prank(nonOwner);
        lineaStateBridge.transferOwnership(newOwner);
    }

    /// @notice tests that the StateBridge contract's ownership can't be set to be the zero address
    function test_owner_transferOwnershipLinea_toZeroAddress_reverts() public {
        vm.expectRevert(AddressZero.selector);

        vm.prank(owner);
        lineaStateBridge.transferOwnershipLinea(address(0), true);
    }

    /// @notice tests that the StateBridge contract's ownership can't be changed by a non-owner
    /// @param newOwner The new owner of the StateBridge contract (foundry fuzz)
    function test_notOwner_transferOwnershipLinea_reverts(address nonOwner, address newOwner, bool isLocal) public {
        vm.assume(nonOwner != owner && newOwner != address(0));

        vm.expectRevert("Ownable: caller is not the owner");

        vm.prank(nonOwner);
        lineaStateBridge.transferOwnershipLinea(newOwner, isLocal);
    }

    /// @notice tests whether the StateBridge contract can set root history expiry
    /// @param _rootHistoryExpiry The new root history expiry
    function test_notOwner_SetRootHistoryExpiry_reverts(address nonOwner, uint256 _rootHistoryExpiry) public {
        vm.assume(nonOwner != owner && nonOwner != address(0) && _rootHistoryExpiry != 0);

        vm.expectRevert("Ownable: caller is not the owner");

        vm.prank(nonOwner);
        lineaStateBridge.setRootHistoryExpiry(_rootHistoryExpiry);
    }

    /// @notice Tests that a nonPendingOwner can't accept ownership of StateBridge
    /// @param newOwner the new owner of the contract
    function test_notOwner_acceptOwnership_reverts(address newOwner, address randomAddress) public {
        vm.assume(newOwner != address(0) && randomAddress != address(0) && randomAddress != newOwner);

        vm.prank(owner);
        lineaStateBridge.transferOwnership(newOwner);

        vm.expectRevert("Ownable2Step: caller is not the new owner");

        vm.prank(randomAddress);
        lineaStateBridge.acceptOwnership();
    }

    /// @notice Tests that ownership can't be renounced
    function test_owner_renounceOwnership_reverts() public {
        vm.expectRevert(CannotRenounceOwnership.selector);

        vm.prank(owner);
        lineaStateBridge.renounceOwnership();
    }

    /// @notice Tests that setMessageService reverts for address zero
    function test_owner_setMessageService_reverts() public {
        vm.expectRevert(AddressZero.selector);

        vm.prank(owner);
        lineaStateBridge.setMessageService(address(0));
    }
}
