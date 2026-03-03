// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SVGUtils
 * @author Sleep Protocol
 * @notice A library for generating and manipulating SVG strings on-chain.
 *         Includes helpers for formatting numbers into strings for display.
 */
library SVGUtils {
    using Strings for uint256;

    /**
     * @notice Converts a uint256 with a specified number of decimals into a formatted string.
     * @dev For example, formatDecimal(12345, 2) -> "123.45"
     *      formatDecimal(12300, 2) -> "123.00"
     *      formatDecimal(12345, 4) -> "1.2345"
     *      Handles up to 18 decimals.
     * @param value The amount to format.
     * @param decimals The number of decimal places the value has.
     * @param displayDecimals The number of decimal places to show in the output string.
     * @return A string representation of the number with a decimal point.
     */
    function formatDecimal(uint256 value, uint8 decimals, uint8 displayDecimals) internal pure returns (string memory) {
        if (decimals == 0) {
            return value.toString();
        }

        uint8 clampedDisplayDecimals = displayDecimals > decimals ? decimals : displayDecimals;
        
        uint256 divisor = 10**uint256(decimals);
        uint256 integerPart = value / divisor;
        uint256 fractionalPart = value % divisor;

        if (clampedDisplayDecimals == 0) {
            return integerPart.toString();
        }

        uint256 displayDivisor = 10**uint256(decimals - clampedDisplayDecimals);
        uint256 displayFractionalPart = fractionalPart / displayDivisor;
        
        string memory fractionalString = displayFractionalPart.toString();
        
        // Pad with leading zeros if necessary
        uint256 fractionalLength = bytes(fractionalString).length;
        if (fractionalLength < clampedDisplayDecimals) {
            string memory padding = "";
            for (uint i = 0; i < clampedDisplayDecimals - fractionalLength; i++) {
                padding = string(abi.encodePacked("0", padding));
            }
            fractionalString = string(abi.encodePacked(padding, fractionalString));
        }

        return string(abi.encodePacked(integerPart.toString(), ".", fractionalString));
    }

    /**
     * @notice Replaces first occurrence of a substring with another string.
     * @dev A simple string replacement function. More complex logic might be needed for multiple replacements.
     * @param source The original string.
     * @param target The substring to replace.
     * @param replacement The string to insert.
     * @return The modified string.
     */
    function replace(string memory source, string memory target, string memory replacement) internal pure returns (string memory) {
        bytes memory sourceBytes = bytes(source);
        bytes memory targetBytes = bytes(target);
        bytes memory replacementBytes = bytes(replacement);

        if (targetBytes.length == 0) {
            return source;
        }

        // Find the first occurrence of the target
        for (uint i = 0; i <= sourceBytes.length - targetBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < targetBytes.length; j++) {
                if (sourceBytes[i+j] != targetBytes[j]) {
                    found = false;
                    break;
                }
            }

            if (found) {
                // If found, construct the new string
                bytes memory result = new bytes(sourceBytes.length - targetBytes.length + replacementBytes.length);
                
                // Copy the part before the target
                for (uint k = 0; k < i; k++) {
                    result[k] = sourceBytes[k];
                }
                
                // Copy the replacement
                for (uint k = 0; k < replacementBytes.length; k++) {
                    result[i+k] = replacementBytes[k];
                }

                // Copy the part after the target
                for (uint k = 0; k < sourceBytes.length - (i + targetBytes.length); k++) {
                    result[i + replacementBytes.length + k] = sourceBytes[i + targetBytes.length + k];
                }

                return string(result);
            }
        }

        // If the target is not found, return the original string
        return source;
    }
}
