// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { LineaStateBridge } from "../LineaStateBridge.sol";

contract CallPropagateRoot is Script {
    LineaStateBridge public lineaStateBridge;

    address public lineaStateBridgeAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        lineaStateBridge = LineaStateBridge(lineaStateBridgeAddress);

        lineaStateBridge.setGasLimitTransferOwnershipOp(0.001 ether);

        // Propagate root to L2
        lineaStateBridge.propagateRoot{value: 0.001 ether}();

        vm.stopBroadcast();
    }
}
