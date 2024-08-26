// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { LineaWorldID } from "../LineaWorldID.sol";

contract InitializeLineaWorldID is Script {
    LineaWorldID public lineaWorldID;

    address public lineaWorldIDAddress;
    address public lineaStateBridgeAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        lineaWorldID = LineaWorldID(lineaWorldIDAddress);

        // Transfer ownership to LineaStateBridge on L1
        lineaWorldID.transferOwnership(lineaStateBridgeAddress, false);

        vm.stopBroadcast();

        console.log("Finished processing events");
    }
}
