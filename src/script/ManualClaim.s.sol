// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { LineaWorldID } from "../LineaWorldID.sol";
import { IMessageService } from "linea-contracts/interfaces/IMessageService.sol";

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
        uint256 messageAmount = vm.envUint("MESSAGE_AMOUNT");
        uint256 messageNonce = vm.envUint("MESSAGE_NONCE");
        bytes memory messageData = vm.envBytes("MESSAGE_DATA");
        uint256 messageFee = vm.envUint("MESSAGE_FEE");
        address payable refundAddress = payable(vm.envAddress("REFUND_ADDRESS"));

        vm.startBroadcast(privateKey);

        messageService = IMessageService(messageServiceAddressL2);

        // Manually claim the message using environment variables
        messageService.claimMessage(
            lineaStateBridgeAddress,
            lineaWorldIDAddress,
            messageAmount,
            messageFee,
            refundAddress,
            messageData,
            messageNonce
        );

        vm.stopBroadcast();

        console.log("Finished processing events");
    }
}
