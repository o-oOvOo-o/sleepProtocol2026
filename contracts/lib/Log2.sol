// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Log2
 * @author Inspired by XEN Crypto
 * @notice Provides a cheap integer approximation of log2(x)
 */
library Log2 {
    function log2(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        uint256 msb = 0;
        uint256 temp = n;
        while (temp > 0) {
            temp >>= 1;
            msb++;
        }
        return msb - 1;
    }
}

