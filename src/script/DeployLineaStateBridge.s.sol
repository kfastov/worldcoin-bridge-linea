// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/src/Script.sol";
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

        bridge = new LineaStateBridge(worldIDIdentityManagerAddress, lineaWorldIDAddress, messageServiceAddress);
        vm.stopBroadcast();
    }
}
