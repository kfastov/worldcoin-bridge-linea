// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/src/Script.sol";
import { LineaStateBridge } from "../LineaStateBridge.sol";

contract InitializeLineaStateBridge is Script {
    LineaStateBridge public lineaStateBridge;

    address public lineaWorldIDAddress;
    address public lineaStateBridgeAddress;
    address public messageServiceAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        messageServiceAddress = abi.decode(vm.parseJson(json, ".messageServiceAddress"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        lineaStateBridge = LineaStateBridge(lineaStateBridgeAddress);
        lineaStateBridge.transferOwnershipLinea(messageServiceAddress, lineaStateBridgeAddress);
        vm.stopBroadcast();
    }
}
