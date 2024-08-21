// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/console.sol";
import { Script } from "forge-std/Script.sol";
import { LineaStateBridge } from "../LineaStateBridge.sol";

contract DeployLineaStateBridge is Script {
    LineaStateBridge public bridge;

    address public worldIDIdentityManagerAddress;
    address public lineaWorldIDAddress;
    address public messageServiceAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        // https://docs.worldcoin.org/reference/address-book

        messageServiceAddress = abi.decode(vm.parseJson(json, ".messageServiceAddressL1"), (address));
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        worldIDIdentityManagerAddress = abi.decode(vm.parseJson(json, ".worldIDIdentityManagerAddress"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        // Check if lineaStateBridgeAddress is already in the JSON config
        bytes memory encodedAddress = vm.parseJson(json, ".lineaStateBridgeAddress");

        if (encodedAddress.length > 0) {
            // If the address exists, load it
            address existingBridgeAddress = abi.decode(encodedAddress, (address));
            bridge = LineaStateBridge(existingBridgeAddress);
            console.log("Loaded existing LineaStateBridge at:", address(bridge));
        } else {
            // If the address doesn't exist, deploy a new contract
            bridge = new LineaStateBridge(worldIDIdentityManagerAddress, lineaWorldIDAddress, messageServiceAddress);
            console.log("Deployed new LineaStateBridge at:", address(bridge));

            // Store the deployed address in the config JSON
            vm.writeJson(vm.toString(address(bridge)), path, ".lineaStateBridgeAddress");
        }

        vm.stopBroadcast();
    }
}
