// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;


import {Script} from "forge-std/src/Script.sol";
import {LineaStateBridge} from "../LineaStateBridge.sol";

contract InitializeLineaStateBridge is Script {
    LineaStateBridge public lineaStateBridge;

    address public lineaWorldIDAddress;
    address public lineaStateBridgeAddress;
    address public messageServiceAddress;

    uint256 public privateKey;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = string.concat(root, "/src/script/.deploy-config.json");
    string public json = vm.readFile(path);

    function setUp() public {
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, "lineaStateBridgeAddress"), (address));
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, "lineaWorldIDAddress"), (address));
        messageServiceAddress = abi.decode(vm.parseJson(json, "messageServiceAddress"), (address));
    }

    function run() external  {
        privateKey = abi.decode(vm.parseJson(json, ".privateKey"), (uint256));
        vm.startBroadcast(privateKey);

        lineaStateBridge = LineaStateBridge(lineaWorldIDAddress);
        lineaStateBridge.transferOwnershipLinea(messageServiceAddress, lineaStateBridgeAddress);
    }
}