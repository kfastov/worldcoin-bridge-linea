// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { Script } from "forge-std/Script.sol";
import { PolygonWorldID } from "src/PolygonWorldID.sol";

/// @title PolygonWorldID deployment script on Polygon PoS mainnet
/// @notice forge script to deploy PolygonWorldID.sol
/// @author Worldcoin
/// @dev Can be executed by running `make mock`, `make deploy` or `make deploy-testnet`.
contract DeployPolygonWorldID is Script {
    address public stateBridgeAddress;

    // Polygon PoS Mainnet Child Tunnel
    address public fxChildAddress = address(0x8397259c983751DAf40400790063935a11afa28a);

    PolygonWorldID public polygonWorldId;
    uint256 public privateKey;
    uint8 public treeDepth;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = string.concat(root, "/src/script/.deploy-config.json");
    string public json = vm.readFile(path);

    function setUp() public {
        privateKey = abi.decode(vm.parseJson(json, ".privateKey"), (uint256));
        treeDepth = uint8(30);
    }

    function run() external {
        vm.startBroadcast(privateKey);

        polygonWorldId = new PolygonWorldID(treeDepth, fxChildAddress);

        vm.stopBroadcast();
    }
}
