// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Script} from "forge-std/src/Script.sol";
import {LineaWorldID} from "../LineaWorldID.sol";


contract DeployLinearWorldID is Script {
    LineaWorldID public lineaWorldId;

    address public messageServiceAddress;
    address public remoteSenderAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = string.concat(root, "/src/script/.deploy-config.json");
    string public json = vm.readFile(path);

    uint8 public treeDepth;
    uint256 public privateKey;

    function setUp() public {

        messageServiceAddress =
            abi.decode(vm.parseJson(json, ".messageServiceAddress"), (address));
        
        remoteSenderAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));


    }

    function run() external {
        privateKey = abi.decode(vm.parseJson(json, ".privateKey"), (uint256));
        vm.startBroadcast(privateKey);

        lineaWorldId = new LineaWorldID(treeDepth, messageServiceAddress, remoteSenderAddress);
        vm.stopBroadcast();
    }

}