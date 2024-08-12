// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { LineaStateBridge } from "../LineaStateBridge.sol";

contract InitializeLineaStateBridge is Script {
    LineaStateBridge public lineaStateBridge;

    address public lineaWorldIDAddress;
    address public lineaStateBridgeAddress;
    address public messageServiceAddressL2;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        messageServiceAddressL2 = abi.decode(vm.parseJson(json, ".messageServiceAddressL2"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        lineaStateBridge = LineaStateBridge(lineaStateBridgeAddress);
        lineaStateBridge.transferOwnership(lineaStateBridgeAddress, false);
        vm.stopBroadcast();
    }
}
