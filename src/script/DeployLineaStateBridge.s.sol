// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { console } from "forge-std/console.sol";
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
    string public path = "./src/script/config.json";
    string public json = vm.readFile(path);

    error ConfigError();

    function setUp() public {
        // https://docs.worldcoin.org/reference/address-book

        bytes memory messageServiceJson = vm.parseJson(json, ".messageServiceAddressL1");
        bytes memory lineaWorldIDJson = vm.parseJson(json, ".lineaWorldIDAddress");
        bytes memory worldIDIdentityManagerJson = vm.parseJson(json, ".worldIDIdentityManagerAddress");

        if (messageServiceJson.length != 32 || lineaWorldIDJson.length != 32 || worldIDIdentityManagerJson.length != 32)
        {
            console.log("Config Error: required addresses not set");
            revert ConfigError();
        }
        messageServiceAddress = abi.decode(messageServiceJson, (address));
        lineaWorldIDAddress = abi.decode(lineaWorldIDJson, (address));
        worldIDIdentityManagerAddress = abi.decode(worldIDIdentityManagerJson, (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        // Check if lineaStateBridgeAddress is already in the JSON config
        bytes memory encodedAddress = vm.parseJson(json, ".lineaStateBridgeAddress");

        if (encodedAddress.length == 32) {
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