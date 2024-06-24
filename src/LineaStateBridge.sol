// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// Optimism interface for cross domain messaging
import { ICrossDomainMessenger } from "@eth-optimism/contracts/libraries/bridge/ICrossDomainMessenger.sol";
import { IOpWorldID } from "world-id-state-bridge/interfaces/IOpWorldID.sol";
import { IRootHistory } from "world-id-state-bridge/interfaces/IRootHistory.sol";
import { IWorldIDIdentityManager } from "world-id-state-bridge/interfaces/IWorldIDIdentityManager.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ICrossDomainOwnable3 } from "world-id-state-bridge/interfaces/ICrossDomainOwnable3.sol";

/// @title World ID State Bridge Optimism
/// @author Worldcoin
/// @notice Distributes new World ID Identity Manager roots to the Linea chain
/// @dev This contract lives on Ethereum mainnet and works for Linea
contract LineaStateBridge is Ownable2Step {
// TODO: implement
}
