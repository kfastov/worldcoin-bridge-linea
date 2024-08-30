// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { IMessageService } from "linea-contracts/interfaces/IMessageService.sol";

contract ManualClaim is Script {
    IMessageService public messageService;

    address public lineaWorldIDAddress;
    address public lineaStateBridgeAddress;
    address public messageServiceAddressL2;

    ///////////////////////////////////////////////////////////////////
    ///                            CONFIG                           ///
    ///////////////////////////////////////////////////////////////////
    string public root = vm.projectRoot();
    string public path = "./config.json";
    string public json = vm.readFile(path);

    function setUp() public {
        lineaWorldIDAddress = abi.decode(vm.parseJson(json, ".lineaWorldIDAddress"), (address));
        lineaStateBridgeAddress = abi.decode(vm.parseJson(json, ".lineaStateBridgeAddress"), (address));
        messageServiceAddressL2 = abi.decode(vm.parseJson(json, ".messageServiceAddressL2"), (address));
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        uint256 fee = vm.envUint("MSG_CLAIM_FEE");
        uint256 value = vm.envUint("MSG_CLAIM_VALUE");
        uint256 nonce = vm.envUint("MSG_CLAIM_NONCE");
        bytes memory data = vm.envBytes("MSG_CLAIM_CALLDATA");
        address payable feeRecipient = payable(vm.envAddress("MSG_CLAIM_FEE_RECIPIENT"));
        vm.startBroadcast(privateKey);

        messageService = IMessageService(messageServiceAddressL2);

        // Manually claim the message
        // solhint-disable-next-line max-line-length
        messageService.claimMessage(lineaStateBridgeAddress, lineaWorldIDAddress, fee, value, feeRecipient, data, nonce);

        vm.stopBroadcast();

        console.log("Finished processing events");
    }
}
