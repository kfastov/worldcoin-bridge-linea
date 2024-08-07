// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/LineaWorldID.sol";
import "../src/interfaces/IMessageService.sol";

contract MockMessageService is IMessageService {
    address public senderAddress;

    function setSender(address _sender) external {
        senderAddress = _sender;
    }

    function sender() external view returns (address) {
        return senderAddress;
    }

    function sendMessage(address, uint256, bytes calldata) external payable {}
    function claimMessage(address, address, uint256, uint256, address payable, bytes calldata, uint256) external {}
}

contract LineaWorldIDTest is Test {
    LineaWorldID public lineaWorldID;
    MockMessageService public mockMessageService;
    uint8 constant TREE_DEPTH = 30;
    address constant OWNER = address(0x1234);

    // Error selectors 
    bytes4 constant CallerIsNotOwner = bytes4(keccak256("Ownable: caller is not the owner"));
    bytes4 constant NonExistentRoot = bytes4(keccak256("NonExistentRoot()"));
    bytes4 constant CannotOverwriteRoot = bytes4(keccak256("CannotOverwriteRoot()"));

    event RootAdded(uint256 root, uint128 timestamp);
    event RootHistoryExpirySet(uint256 newExpiry);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner, bool isLocal);
    event MessageServiceUpdated(address indexed oldMessageService, address indexed newMessageService);

    function setUp() public {
        mockMessageService = new MockMessageService();
        lineaWorldID = new LineaWorldID(TREE_DEPTH, address(mockMessageService));
        lineaWorldID.transferOwnership(OWNER, true);
    }

    function testInitialState() public {
        assertEq(lineaWorldID.getTreeDepth(), TREE_DEPTH);
        assertEq(lineaWorldID.owner(), OWNER);
        assertEq(address(lineaWorldID.messageService()), address(mockMessageService));
        assertEq(lineaWorldID.isLocal(), true);
    }

    function testReceiveRoot() public {
        uint256 newRoot = 3 weeks;

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit RootAdded(newRoot, uint128(block.timestamp));
        lineaWorldID.receiveRoot(newRoot);

        assertEq(lineaWorldID.latestRoot(), newRoot);
    }

    function testReceiveRootNonOwner() public {
        uint256 newRoot = 3 weeks;

        vm.expectRevert(CallerIsNotOwner);
        lineaWorldID.receiveRoot(newRoot);
    }

    function testSetRootHistoryExpiry() public {
        uint256 newExpiry = 2 weeks;

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit RootHistoryExpirySet(newExpiry);
        lineaWorldID.setRootHistoryExpiry(newExpiry);

        assertEq(lineaWorldID.rootHistoryExpiry(), newExpiry);
    }

    function testSetRootHistoryExpiryNonOwner() public {
        uint256 newExpiry = 2 weeks;

        vm.expectRevert(CallerIsNotOwner);
        lineaWorldID.setRootHistoryExpiry(newExpiry);
    }

    function testVerifyProof() public {
        uint256 root = 2 weeks;
        uint256 signalHash = 987654321;
        uint256 nullifierHash = 135792468;
        uint256 externalNullifierHash = 246813579;
        uint256[8] memory proof;

        vm.prank(OWNER);
        lineaWorldID.receiveRoot(root);

        vm.mockCall(
            address(lineaWorldID),
            abi.encodeWithSignature("verifyProof(uint256,uint256,uint256,uint256,uint256[8])", root, signalHash, nullifierHash, externalNullifierHash, proof),
            abi.encode()
        );

        lineaWorldID.verifyProof(root, signalHash, nullifierHash, externalNullifierHash, proof);
    }

    function testReceiveRootOverwrite() public {
        uint256 newRoot = uint256(keccak256("newRoot"));

        vm.startPrank(OWNER);
        lineaWorldID.receiveRoot(newRoot);
        vm.expectRevert(CannotOverwriteRoot);
        lineaWorldID.receiveRoot(newRoot);
        vm.stopPrank();
    }

    function testVerifyProofInvalidRoot() public {
        uint256 root = 2 weeks;
        uint256 signalHash = 987654321;
        uint256 nullifierHash = 135792468;
        uint256 externalNullifierHash = 246813579;
        uint256[8] memory proof;

        vm.expectRevert(NonExistentRoot);
        lineaWorldID.verifyProof(root, signalHash, nullifierHash, externalNullifierHash, proof);
    }

    function testTransferOwnership() public {
        address newOwner = address(0x5678);
        bool newIsLocal = false;

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(OWNER, newOwner, newIsLocal);
        lineaWorldID.transferOwnership(newOwner, newIsLocal);

        assertEq(lineaWorldID.owner(), newOwner);
        assertEq(lineaWorldID.isLocal(), newIsLocal);
    }

    function testSetMessagingService() public {
        address newMessageService = address(0x9876);

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit MessageServiceUpdated(address(mockMessageService), newMessageService);
        lineaWorldID.setMessagingService(newMessageService);

        assertEq(address(lineaWorldID.messageService()), newMessageService);
    }
}