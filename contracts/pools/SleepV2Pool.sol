// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISleepPool.sol";
import "./libraries/TaxCalculator.sol";

/**
 * @title SleepV2Pool
 * @dev Protocol-Owned Liquidity Pool based on Uniswap V2 with built-in tax system
 *      This pool provides permanent liquidity and price stability for Sleep Protocol
 */
contract SleepV2Pool is ISleepPool, Ownable, ReentrancyGuard {
    using TaxCalculator for uint256;
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    // Pool tokens
    address public token0; // SLEEPING token
    address public token1; // OKB token
    address public factory; // Factory contract that created this pool
    
    // Reserves
    uint112 private reserve0;           
    uint112 private reserve1;           
    uint32 private blockTimestampLast;  
    
    // Price tracking
    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast;
    
    // Tax system
    uint256 public genesisTimestamp;
    address public treasury;
    bool public taxEnabled = true;
    mapping(address => bool) public taxExempt;
    
    // Protocol-owned liquidity tracking
    uint256 public totalLiquidity;
    bool public liquidityLocked = false;
    
    // Reentrancy protection
    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'SleepV2Pool: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);
    event LiquidityLocked();
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor() {
        // Constructor is empty - initialization happens via initialize()
    }
    
    /**
     * @dev Initialize the pool (called by factory)
     */
    function initialize(
        address _token0,  // SLEEPING
        address _token1,  // OKB  
        address _treasury
    ) external {
        // Security: Only factory can initialize, or first-time initialization
        require(
            msg.sender == factory || factory == address(0), 
            "SleepV2Pool: Only factory can initialize"
        );
        require(token0 == address(0), "SleepV2Pool: Already initialized");
        require(_token0 != address(0), "SleepV2Pool: Invalid token0");
        require(_token1 != address(0), "SleepV2Pool: Invalid token1");
        require(_treasury != address(0), "SleepV2Pool: Invalid treasury");
        
        // Set factory on first initialization
        if (factory == address(0)) {
            factory = msg.sender;
        }
        
        token0 = _token0;
        token1 = _token1;
        treasury = _treasury;
        genesisTimestamp = block.timestamp;
        
        // Treasury is exempt from taxes
        taxExempt[_treasury] = true;
        // Contract itself is exempt (for internal operations)
        taxExempt[address(this)] = true;
        // Factory is exempt (for management operations)
        taxExempt[factory] = true;
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    function getPoolInfo() external view override returns (PoolInfo memory) {
        return PoolInfo({
            token0: token0,
            token1: token1,
            reserve0: reserve0,
            reserve1: reserve1,
            blockTimestampLast: blockTimestampLast,
            genesisTimestamp: genesisTimestamp,
            treasury: treasury,
            taxEnabled: taxEnabled
        });
    }
    
    function getTaxInfo() external view override returns (TaxInfo memory) {
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        (uint256 stage, uint256 daysInStage, uint256 daysUntilNext) = TaxCalculator.getTaxStageInfo(genesisTimestamp);
        
        return TaxInfo({
            currentBuyTax: rates.buyTax,
            currentSellTax: rates.sellTax,
            stage: stage,
            daysInStage: daysInStage,
            daysUntilNext: daysUntilNext
        });
    }
    
    function isExemptFromTax(address account) external view override returns (bool) {
        return taxExempt[account];
    }
    
    function calculateTax(
        uint256 amount,
        bool isBuy,
        address trader
    ) external view override returns (uint256 taxAmount, uint256 netAmount) {
        if (!taxEnabled || taxExempt[trader]) {
            return (0, amount);
        }
        
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
        
        taxAmount = TaxCalculator.calculateTaxAmount(amount, taxRate);
        netAmount = TaxCalculator.calculateNetAmount(amount, taxAmount);
    }
    
    // =================================================================================================
    //                                      CORE FUNCTIONS                                            
    // =================================================================================================
    
    function mint(address to) external override lock nonReentrant returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;
        
        if (totalLiquidity == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            totalLiquidity = MINIMUM_LIQUIDITY; // Permanently locked
        } else {
            liquidity = _min(
                (amount0 * totalLiquidity) / _reserve0,
                (amount1 * totalLiquidity) / _reserve1
            );
        }
        
        require(liquidity > 0, 'SleepV2Pool: INSUFFICIENT_LIQUIDITY_MINTED');
        totalLiquidity += liquidity;
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }
    
    function burn(address to) external override returns (uint amount0, uint amount1) {
        // Protocol-owned pool does not allow burning liquidity
        // This is a security feature to prevent accidental or malicious liquidity removal
        revert("SleepV2Pool: Burn not allowed for protocol-owned pool");
    }
    
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external override lock nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, 'SleepV2Pool: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'SleepV2Pool: INSUFFICIENT_LIQUIDITY');

        uint amount0In;
        uint amount1In;
        address _token0 = token0;
        address _token1 = token1;

        { // scope for avoiding stack too deep errors
            require(to != _token0 && to != _token1, 'SleepV2Pool: INVALID_TO');
            
            // Standard Uniswap V2 Pattern: Calculate amountIn based on amountOut and reserves
            if (amount0Out > 0) { // User wants token0
                amount1In = getAmountIn(amount0Out, _reserve1, _reserve0);
            } else { // User wants token1
                amount0In = getAmountIn(amount1Out, _reserve0, _reserve1);
            }
            
            require(amount0In > 0 || amount1In > 0, 'SleepV2Pool: INSUFFICIENT_INPUT_AMOUNT');

            // Pull tokens from the router (msg.sender)
            if (amount0In > 0) IERC20(_token0).transferFrom(msg.sender, address(this), amount0In);
            if (amount1In > 0) IERC20(_token1).transferFrom(msg.sender, address(this), amount1In);
        }

        // Apply taxes
        uint256 taxAmount = 0;
        uint256 stage = 0;
        if (taxEnabled && !taxExempt[msg.sender]) {
            TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
            stage = rates.stage;
            
            bool isBuy = amount0In > 0; // Buying SLEEPING (token0) with OKB (token1)
            uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
            
            if (taxRate > 0) {
                uint256 taxableAmount = isBuy ? amount1In : amount0In;
                taxAmount = TaxCalculator.calculateTaxAmount(taxableAmount, taxRate);
                
                if (taxAmount > 0) {
                    address taxToken = isBuy ? token1 : token0;
                    _safeTransfer(taxToken, treasury, taxAmount);
                    emit TaxCollected(msg.sender, taxAmount, stage, isBuy);
                }
            }
        }

        // Send output tokens to the recipient
        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);

        // Update reserves
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        _update(balance0, balance1, _reserve0, _reserve1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to, taxAmount, stage);
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    function setTaxExemption(address account, bool isExempt) external override onlyOwner {
        taxExempt[account] = isExempt;
        emit TaxExemptionUpdated(account, isExempt);
    }
    
    function setTreasury(address newTreasury) external override onlyOwner {
        require(newTreasury != address(0), "SleepV2Pool: Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        // Update tax exemptions
        taxExempt[oldTreasury] = false;
        taxExempt[newTreasury] = true;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    function setGenesisTimestamp(uint256 timestamp) external override onlyOwner {
        require(timestamp > 0, "SleepV2Pool: Invalid timestamp");
        require(totalLiquidity == 0, "SleepV2Pool: Already initialized");
        genesisTimestamp = timestamp;
        emit GenesisTimestampSet(timestamp);
    }
    
    function setTaxEnabled(bool enabled) external override onlyOwner {
        taxEnabled = enabled;
    }
    
    function lockLiquidity() external onlyOwner {
        require(!liquidityLocked, "SleepV2Pool: Already locked");
        liquidityLocked = true;
        emit LiquidityLocked();
    }
    
    // =================================================================================================
    //                                      INTERNAL FUNCTIONS                                            
    // =================================================================================================

    // Public view function to get amount in for a given amount out
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure returns (uint amountIn) {
        require(amountOut > 0, "SleepV2Pool: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "SleepV2Pool: INSUFFICIENT_LIQUIDITY");
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997; // Uniswap V2 fee is 0.3%
        amountIn = (numerator / denominator) + 1;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'SleepV2Pool: TRANSFER_FAILED');
    }
    
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, 'SleepV2Pool: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve1), _reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve0), _reserve1)) * timeElapsed;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }
    
    function _sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function _min(uint x, uint y) internal pure returns (uint z) {
        z = x < y ? x : y;
    }
}

// UQ112x112 library for price calculations (simplified version)
library UQ112x112 {
    uint224 constant Q112 = 2**112;
    
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112;
    }
    
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}
