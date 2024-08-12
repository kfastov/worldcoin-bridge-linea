// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { LineaWorldID } from "../LineaWorldID.sol";
import "forge-std/console.sol";

contract DeployLineaWorldID is Script {
    LineaWorldID public lineaWorldId;

    address public messageServiceAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    uint8 public treeDepth;

    function setUp() public {
        messageServiceAddress = abi.decode(vm.parseJson(json, ".messageServiceAddressL2"), (address));
        treeDepth = uint8(30);
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        // Check if lineaWorldIdAddress is already in the JSON config
        bytes memory encodedAddress = vm.parseJson(json, ".lineaWorldIdAddress");

        if (encodedAddress.length > 0) {
            // If the address exists, load it
            address existingWorldIdAddress = abi.decode(encodedAddress, (address));
            lineaWorldId = LineaWorldID(existingWorldIdAddress);
            console.log("Loaded existing LineaWorldID at:", address(lineaWorldId));
        } else {
            // If the address doesn't exist, deploy a new contract
            lineaWorldId = new LineaWorldID(treeDepth, messageServiceAddress);
            console.log("Deployed new LineaWorldID at:", address(lineaWorldId));

            // Store the deployed address in the config JSON
            vm.writeJson(vm.toString(address(lineaWorldId)), path, ".lineaWorldIdAddress");
        }

        vm.stopBroadcast();
    }
}
