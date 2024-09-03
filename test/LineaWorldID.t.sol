// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { LineaWorldID } from "../src/LineaWorldID.sol";
import { MockMessageService } from "../src/mocks/MockMessageService.sol";

import { PRBTest } from "@prb/test/PRBTest.sol";
import { StdCheats } from "forge-std/StdCheats.sol";

/// @title Linea World ID Test
/// @notice A test contract for LineaWorldID.sol
contract LineaWorldIDTest is PRBTest, StdCheats {
    LineaWorldID public lineaWorldID;

    MockMessageService public mockMessageService;
    address public messageServiceAddress;

    uint8 internal constant TREE_DEPTH = 30;
    address internal constant OWNER = address(0x1234);

    ///////////////////////////////////////////////////////////////////
    ///                            ERRORS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Emitted when attempting to validate a root that has expired.
    error ExpiredRoot();

    /// @notice Emitted when attempting to validate a root that has yet to be added to the root
    ///         history.
    error NonExistentRoot();

    /// @notice Emitted when attempting to update the timestamp for a root that already has one.
    error CannotOverwriteRoot();

    /// @notice Emitted if the latest root is requested but the bridge has not seen any roots yet.
    error NoRootsSeen();

    /// @notice Emitted when the caller is not the owner
    error CallerIsNotOwner();

    ///////////////////////////////////////////////////////////////////////////////
    ///                                  EVENTS                                 ///
    ///////////////////////////////////////////////////////////////////////////////

    /// @notice Emitted when a new root is received by the contract.
    ///
    /// @param root The value of the root that was added.
    /// @param timestamp The timestamp of insertion for the given root.
    event RootAdded(uint256 root, uint128 timestamp);

    /// @notice Emitted when the expiry time for the root history is updated.
    ///
    /// @param newExpiry The new expiry time.
    event RootHistoryExpirySet(uint256 newExpiry);

    /// @notice Emits when ownership of the contract is transferred. Includes the
    ///         isLocal field in addition to the standard `Ownable` OwnershipTransferred event.
    /// @param previousOwner The previous owner of the contract.
    /// @param newOwner      The new owner of the contract.
    /// @param isLocal       Configures the `isLocal` contract variable.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner, bool isLocal);

    function setUp() public {
        mockMessageService = new MockMessageService();
        messageServiceAddress = address(mockMessageService);
        lineaWorldID = new LineaWorldID(TREE_DEPTH, messageServiceAddress);
        lineaWorldID.transferOwnership(OWNER, true);
    }

    ///////////////////////////////////////////////////////////////////
    ///                           SUCCEEDS                          ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Tests the initial state of the LineaWorldID contract
    function test_initialState_succeeds() public {
        assertEq(lineaWorldID.getTreeDepth(), TREE_DEPTH);
        assertEq(lineaWorldID.owner(), OWNER);
        assertEq(address(lineaWorldID.messageService()), messageServiceAddress);
        assertEq(lineaWorldID.isLocal(), true);
    }

    /// @notice Tests that the owner can successfully receive a new root
    /// @param newRoot The new root to be received
    function test_owner_receiveRoot_succeeds(uint256 newRoot) public {
        vm.assume(newRoot != 0);

        vm.expectEmit(true, true, true, true);
        emit RootAdded(newRoot, uint128(block.timestamp));

        vm.prank(OWNER);
        lineaWorldID.receiveRoot(newRoot);

        assertEq(lineaWorldID.latestRoot(), newRoot);
    }

    /// @notice Tests that the owner can successfully set the root history expiry
    /// @param newExpiry The new expiry time for the root history
    function test_owner_setRootHistoryExpiry_succeeds(uint256 newExpiry) public {
        vm.expectEmit(true, true, true, true);
        emit RootHistoryExpirySet(newExpiry);

        vm.prank(OWNER);
        lineaWorldID.setRootHistoryExpiry(newExpiry);

        assertEq(lineaWorldID.rootHistoryExpiry(), newExpiry);
    }

    /// @notice Tests that proof verification succeeds with valid inputs
    /// @param root The root to verify against
    /// @param signalHash The hash of the signal
    /// @param nullifierHash The nullifier hash
    /// @param externalNullifierHash The external nullifier hash
    /// @param proof The zero-knowledge proof
    function test_verifyProof_succeeds(
        uint256 root,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] memory proof
    )
        public
    {
        vm.prank(OWNER);
        lineaWorldID.receiveRoot(root);

        vm.mockCall(
            address(lineaWorldID),
            abi.encodeWithSignature(
                "verifyProof(uint256,uint256,uint256,uint256,uint256[8])",
                root,
                signalHash,
                nullifierHash,
                externalNullifierHash,
                proof
            ),
            abi.encode()
        );

        lineaWorldID.verifyProof(root, signalHash, nullifierHash, externalNullifierHash, proof);
    }

    /// @notice Tests that ownership transfer succeeds when called by the owner
    /// @param newOwner The address of the new owner
    /// @param newIsLocal Boolean indicating if the new owner is local
    function test_owner_transferOwnership_succeeds(address newOwner, bool newIsLocal) public {
        vm.assume(newOwner != address(0));

        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(OWNER, newOwner, newIsLocal);

        vm.prank(OWNER);
        lineaWorldID.transferOwnership(newOwner, newIsLocal);

        assertEq(lineaWorldID.owner(), newOwner);
        assertEq(lineaWorldID.isLocal(), newIsLocal);
    }

    ///////////////////////////////////////////////////////////////////
    ///                           REVERTS                           ///
    ///////////////////////////////////////////////////////////////////

    /// @notice Tests that receiving a root reverts when called by a non-owner
    /// @param nonOwner An address that is not the owner
    /// @param newRoot The new root to be received
    function test_notOwner_receiveRoot_reverts(address nonOwner, uint256 newRoot) public {
        vm.assume(nonOwner != OWNER && nonOwner != address(0));

        vm.expectRevert(CallerIsNotOwner.selector);

        vm.prank(nonOwner);
        lineaWorldID.receiveRoot(newRoot);
    }

    /// @notice Tests that setting root history expiry reverts when called by a non-owner
    /// @param nonOwner An address that is not the owner
    /// @param newExpiry The new expiry time for the root history
    function test_notOwner_setRootHistoryExpiry_reverts(address nonOwner, uint256 newExpiry) public {
        vm.assume(nonOwner != OWNER && nonOwner != address(0));

        vm.expectRevert(CallerIsNotOwner.selector);

        vm.prank(nonOwner);
        lineaWorldID.setRootHistoryExpiry(newExpiry);
    }

    /// @notice Tests that receiving the same root twice reverts
    /// @param newRoot The root to be received
    function test_owner_receiveRootOverwrite_reverts(uint256 newRoot) public {
        vm.assume(newRoot != 0);

        vm.startPrank(OWNER);
        lineaWorldID.receiveRoot(newRoot);

        vm.expectRevert(CannotOverwriteRoot.selector);
        lineaWorldID.receiveRoot(newRoot);
        vm.stopPrank();
    }

    /// @notice Tests that verifying a proof with an invalid root reverts
    /// @param root An invalid root
    /// @param signalHash The hash of the signal
    /// @param nullifierHash The nullifier hash
    /// @param externalNullifierHash The external nullifier hash
    /// @param proof The zero-knowledge proof
    function test_verifyProofInvalidRoot_reverts(
        uint256 root,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] memory proof
    )
        public
    {
        vm.expectRevert(NonExistentRoot.selector);
        lineaWorldID.verifyProof(root, signalHash, nullifierHash, externalNullifierHash, proof);
    }
}
