// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.19 <=0.8.24;

import { IMessageService } from "linea-contracts/interfaces/IMessageService.sol";

/**
 * @title Mock Message Service
 * @author Worldcoin & IkemHood
 * @notice Mock implementation of the IMessageService interface for testing functionality on a local chain.
 * @dev deployed through make mock and make local-mock
 */
contract MockMessageService is IMessageService {
    /// @notice Tracks the original sender for mocking purposes.
    address private _originalSender;

    /// @notice Counter to generate unique nonces for each message.
    uint256 private _nonceCounter;

    /// @notice Mapping to keep track of claimed messages to prevent double claims.
    mapping(bytes32 message => bool claimed) private _claimedMessages;

    /// @notice The minimal fee for the message service
    uint256 private constant MINIMAL_FEE = 1;

    /**
     * @notice Sets the original sender address for mocking purposes.
     * @param _sender The address to set as the original sender.
     */
    function setOriginalSender(address _sender) external {
        _originalSender = _sender;
    }

    /**
     * @notice Mocks the process of sending a message.
     * @dev This function should be called with a msg.value = _value + _fee. The fee will be paid on the destination
     * chain.
     * @param _to The destination address on the destination chain.
     * @param _fee The message service fee on the origin chain.
     * @param _calldata The calldata used by the destination message service to call the destination contract.
     */
    function sendMessage(address _to, uint256 _fee, bytes calldata _calldata) external payable override {
        if (msg.value < MINIMAL_FEE) {
            revert FeeTooLow();
        }
        if (msg.value < _fee) {
            revert ValueSentTooLow();
        }

        // Generate a unique message hash based on the message parameters.
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _to, _fee, msg.value, _nonceCounter, _calldata));

        // Emit the MessageSent event with the calculated hash and other details.
        emit MessageSent(msg.sender, _to, _fee, msg.value, _nonceCounter, _calldata, messageHash);

        // Increment the nonce counter for the next message.
        _nonceCounter++;
    }

    /**
     * @notice Mocks the process of claiming a message on the destination chain.
     * @param _from The msg.sender calling the origin message service.
     * @param _to The destination address on the destination chain.
     * @param _fee The message service fee on the origin chain.
     * @param _value The value to be transferred to the destination address.
     * @param _feeRecipient Address that will receive the fees.
     * @param _calldata The calldata used by the destination message service to call/forward to the destination
     * contract.
     * @param _nonce Unique message number.
     */
    function claimMessage(
        address _from,
        address _to,
        uint256 _fee,
        uint256 _value,
        address payable _feeRecipient,
        bytes calldata _calldata,
        uint256 _nonce
    )
        external
        override
    {
        // Decode the message hash based on the provided parameters.
        bytes32 messageHash = keccak256(abi.encodePacked(_from, _to, _fee, _value, _nonce, _calldata));

        // Revert if the message has already been claimed to prevent double claims.
        if (_claimedMessages[messageHash]) {
            revert MessageSendingFailed(_to);
        }

        // Mark the message as claimed.
        _claimedMessages[messageHash] = true;

        // Emit the MessageClaimed event with the calculated hash.
        emit MessageClaimed(messageHash);

        // Simulate sending the fee to the recipient.
        (bool success,) = _feeRecipient.call{ value: _fee }("");
        if (!success) {
            revert FeePaymentFailed(_feeRecipient);
        }

        // Simulate sending the value to the recipient.
        (success,) = _to.call{ value: _value }("");
        if (!success) {
            revert MessageSendingFailed(_to);
        }
    }

    /**
     * @notice Returns the original sender of the message on the origin layer.
     * @return The original sender address.
     */
    function sender() external view override returns (address) {
        return _originalSender;
    }
}
