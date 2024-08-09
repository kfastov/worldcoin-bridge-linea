// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/src/Script.sol";
import { LineaWorldID } from "../LineaWorldID.sol";

contract DeployLineaWorldID is Script {
    LineaWorldID public lineaWorldId;

    address public messageServiceAddress;
    address public remoteSenderAddress;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    uint8 public treeDepth;

    function setUp() public {
        // LineaWorldID is not deployed yet, so use the deployer's address as a placeholder
        address tempAddress = msg.sender;

        remoteSenderAddress = tempAddress;
        messageServiceAddress = abi.decode(vm.parseJson(json, ".messageServiceAddressL2"), (address));
        // remoteSenderAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
        treeDepth = uint8(30);
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        lineaWorldId = new LineaWorldID(treeDepth, messageServiceAddress, remoteSenderAddress);
        vm.stopBroadcast();
    }
}
