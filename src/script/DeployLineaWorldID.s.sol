// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { LineaWorldID } from "../LineaWorldID.sol";
import { console } from "forge-std/console.sol";

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

        lineaWorldId = new LineaWorldID(treeDepth, messageServiceAddress);
        console.log("Deployed new LineaWorldID at:", address(lineaWorldId));

        vm.stopBroadcast();
    }
}

