// SPDX-License-Identifier: BUSL-1.1
// By ABDK Consulting.
// Author: Mikhail Vladimirov <mikhail.vladimirov@gmail.com>
pragma solidity ^0.8.10;

/**
 * Smart contract library for 64.64-bit fixed point math.
 */
library ABDKMath64x64 {
  /**
   * Minimum value of int128.
   */
  int128 private constant MIN_INT128 = -2**127;

  /**
   * Maximum value of int128.
   */
  int128 private constant MAX_INT128 = 2**127 - 1;

  /**
   * Convert to 64.64-bit fixed point number.
   *
   * @param x integer value to convert
   * @return 64.64-bit fixed point number
   */
  function fromInt (int256 x) internal pure returns (int128) {
    unchecked {
      require (x >= -2**63 && x < 2**63);
      return int128 (x << 64);
    }
  }

  /**
   * Convert to 64.64-bit fixed point number.
   *
   * @param x unsigned integer value to convert
   * @return 64.64-bit fixed point number
   */
  function fromUInt (uint256 x) internal pure returns (int128) {
    unchecked {
      require (x < 2**63);
      return int128 (int256 (x << 64));
    }
  }

  /**
   * Convert from 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number to convert
   * @return integer value
   */
  function toInt (int128 x) internal pure returns (int256) {
    unchecked {
      return int256 (x) >> 64;
    }
  }

  /**
   * Convert from 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number to convert
   * @return unsigned integer value
   */
  function toUInt (int128 x) internal pure returns (uint256) {
    unchecked {
      require (x >= 0);
      return uint256 (int256 (x) >> 64);
    }
  }

  /**
   * Add two 64.64-bit fixed point numbers.
   *
   * @param x first number
   * @param y second number
   * @return sum
   */
  function add (int128 x, int128 y) internal pure returns (int128) {
    unchecked {
      int256 r = int256(x) + y;
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Subtract one 64.64-bit fixed point number from another.
   *
   * @param x first number
   * @param y second number
   * @return difference
   */
  function sub (int128 x, int128 y) internal pure returns (int128) {
    unchecked {
      int256 r = int256(x) - y;
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Multiply two 64.64-bit fixed point numbers.
   *
   * @param x first number
   * @param y second number
   * @return product
   */
  function mul (int128 x, int128 y) internal pure returns (int128) {
    unchecked {
      int256 r = (int256 (x) * int256 (y)) >> 64;
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Multiply 64.64-bit fixed point number by integer.
   *
   * @param x 64.64-bit fixed point number
   * @param y integer
   * @return product
   */
  function muli (int128 x, int256 y) internal pure returns (int128) {
    unchecked {
      int256 r = int256 (x) * y;
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Divide one 64.64-bit fixed point number by another.
   *
   * @param x dividend
   * @param y divisor
   * @return quotient
   */
  function div (int128 x, int128 y) internal pure returns (int128) {
    unchecked {
      require (y != 0);
      int256 r = (int256 (x) << 64) / int256 (y);
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Divide 64.64-bit fixed point number by integer.
   *
   * @param x 64.64-bit fixed point number
   * @param y integer
   * @return quotient
   */
  function divi (int128 x, int256 y) internal pure returns (int128) {
    unchecked {
      require (y != 0);
      int256 r = int256 (x) / y;
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Get negative of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return -x
   */
  function neg (int128 x) internal pure returns (int128) {
    unchecked {
      require (x != MIN_INT128);
      return -x;
    }
  }

  /**
   * Get absolute value of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return abs(x)
   */
  function abs (int128 x) internal pure returns (int128) {
    unchecked {
      return x >= 0 ? x : neg (x);
    }
  }

  /**
   * Get reciprocal of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return 1/x
   */
  function inv (int128 x) internal pure returns (int128) {
    unchecked {
      require (x != 0);
      int256 r = (int256 (1) << 128) / int256 (x);
      require (r >= MIN_INT128 && r <= MAX_INT128);
      return int128 (r);
    }
  }

  /**
   * Get average of two 64.64-bit fixed point numbers.
   *
   * @param x first number
   * @param y second number
   * @return (x+y)/2
   */
  function avg (int128 x, int128 y) internal pure returns (int128) {
    unchecked {
      return int128 ((int256 (x) + int256 (y)) >> 1);
    }
  }

  /**
   * Get fractional part of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return fractional part of x
   */
  function frac (int128 x) internal pure returns (int128) {
    unchecked {
      return int128 (int256 (x) & 0xFFFFFFFFFFFFFFFF);
    }
  }

  /**
   * Calculate integer power of 64.64-bit fixed point number.
   *
   * @param x base
   * @param y exponent
   * @return x**y
   */
  function pow (int128 x, uint256 y) internal pure returns (int128) {
    unchecked {
      int128 r = fromUInt (1);
      int128 p = x;

      while (y > 0) {
        if (y & 1 == 1) r = mul (r, p);
        p = mul (p, p);
        y >>= 1;
      }

      return r;
    }
  }

  /**
   * Calculate square root of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return sqrt(x)
   */
  function sqrt (int128 x) internal pure returns (int128) {
    unchecked {
      require (x >= 0);

      if (x == 0) return 0;

      uint256 x_ = toUInt (x);
      uint256 r = x_;
      uint256 p = (r + x_ / r) >> 1;
      while (p < r) {
        r = p;
        p = (r + x_ / r) >> 1;
      }
      return fromUInt (r);
    }
  }

  /**
   * Calculate natural logarithm of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return ln(x)
   */
  function log_2 (int128 x) internal pure returns (int128) {
    unchecked {
      require (x > 0);

      int256 r = 0;

      if (x >= 0x10000000000000000) {
        x = int128 (int256 (x) >> 64);
        r = 64 << 64;
      }

      if (x >= 0x100000000) {
        x = int128 (int256 (x) >> 32);
        r |= 32 << 64;
      }

      if (x >= 0x10000) {
        x = int128 (int256 (x) >> 16);
        r |= 16 << 64;
      }

      if (x >= 0x100) {
        x = int128 (int256 (x) >> 8);
        r |= 8 << 64;
      }

      if (x >= 0x10) {
        x = int128 (int256 (x) >> 4);
        r |= 4 << 64;
      }

      if (x >= 0x4) {
        x = int128 (int256 (x) >> 2);
        r |= 2 << 64;
      }

      if (x >= 0x2) {
        r |= 1 << 64;
      }

      int128 z = fromInt (int256 (x) - (int256 (1) << 64));
      r = r + z - div (mul (z, z), fromInt (2))
          + div (mul (mul (z, z), z), fromInt (3));

      return int128 (r);
    }
  }

  /**
   * Calculate natural logarithm of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return ln(x)
   */
  function ln (int128 x) internal pure returns (int128) {
    unchecked {
      require (x > 0);

      return mul (log_2 (x),
        int128(int256(0xB17217F7D1CF79ABC9E3B39803F2F6AF))); // log_2(e) in 64.64 format
    }
  }

  /**
   * Calculate exponent of 64.64-bit fixed point number.
   *
   * @param x 64.64-bit fixed point number
   * @return exp(x)
   */
  function exp (int128 x) internal pure returns (int128) {
    unchecked {
      require (x < 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF); // Overflow check

      if (x < -0x40000000000000000) return 0; // Underflow check

      int128 r = fromUInt (1);
      int128 p = x;
      int128 y = fromUInt (1);
      uint256 i = 2;
      while (abs (p) > 0) {
        r = add (r, p);
        p = mul (p, x);
        y = mul (y, fromUInt (i));
        i = i + 1;
        p = div (p, y);
      }
      return r;
    }
  }
}

