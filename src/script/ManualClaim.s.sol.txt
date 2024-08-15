// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { LineaWorldID } from "../LineaWorldID.sol";
import { IMessageService } from "../interfaces/IMessageService.sol";

contract ManualClaim is Script {
    IMessageService public messageService;

    address lineaWorldIDAddress;
    address lineaStateBridgeAddress;
    address messageServiceAddressL2;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "src/script/.deploy-config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
        messageServiceAddressL2 = abi.decode(vm.parseJson(json, ".messageServiceAddressL2"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        messageService = IMessageService(messageServiceAddressL2);

        // Manually claim the message
        messageService.claimMessage(
            lineaStateBridgeAddress,
            lineaWorldIDAddress,
            1000000000000000,
            0,
            payable(0),
            hex"FBDE929B214425A01EFDB7EC3937A0BFF5328FA2610ED2F9C5AB15C69BA27D01443055F0",
            3795
        );


        vm.stopBroadcast();

        console.log("Finished processing events");
    }
}
