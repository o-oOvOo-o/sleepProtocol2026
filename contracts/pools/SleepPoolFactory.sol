// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./SleepV2Pool.sol";
import "./SleepV4Pool.sol";
import "./interfaces/ISleepPool.sol";

/**
 * @title SleepPoolFactory
 * @dev Factory contract for creating and managing Sleep Protocol's dual pool system
 */
contract SleepPoolFactory is Ownable, ReentrancyGuard {
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(SleepV2Pool).creationCode));
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    // Core protocol tokens
    address public immutable sleepToken;
    address public immutable okbToken;
    address public immutable treasury;
    
    // Pool addresses
    address public protocolOwnedPool;  // V2-based locked liquidity pool
    address public communityPool;      // V4-based community pool (placeholder)
    address public v4Hook;             // V4 tax hook address
    address public router;             // Sleep Protocol router
    
    // Pool management
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    bool public poolsInitialized = false;
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event ProtocolPoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 pairLength
    );
    
    event CommunityPoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        address hook
    );
    
    event PoolsInitialized(
        address protocolPool,
        address communityPool
    );
    
    event RouterDeployed(
        address indexed router,
        address protocolPool,
        address communityPool
    );
    
    event LiquidityAdded(
        address indexed pool,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor(
        address _sleepToken,
        address _okbToken,
        address _treasury
    ) {
        require(_sleepToken != address(0), "SleepPoolFactory: Invalid SLEEP token");
        require(_okbToken != address(0), "SleepPoolFactory: Invalid OKB token");
        require(_treasury != address(0), "SleepPoolFactory: Invalid treasury");
        
        sleepToken = _sleepToken;
        okbToken = _okbToken;
        treasury = _treasury;
    }
    
    // =================================================================================================
    //                                      POOL CREATION                                            
    // =================================================================================================
    
    /**
     * @dev Create the protocol-owned liquidity pool (V2-based)
     */
    function createProtocolPool() external onlyOwner returns (address pool) {
        require(protocolOwnedPool == address(0), "SleepPoolFactory: Protocol pool already exists");
        
        // Ensure consistent token ordering
        (address token0, address token1) = sleepToken < okbToken ? 
            (sleepToken, okbToken) : (okbToken, sleepToken);
        
        require(token0 != address(0), "SleepPoolFactory: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "SleepPoolFactory: PAIR_EXISTS");
        
        // Create new V2 pool
        bytes memory bytecode = type(SleepV2Pool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the pool
        SleepV2Pool(pool).initialize(token0, token1, treasury);
        
        // Update mappings
        getPair[token0][token1] = pool;
        getPair[token1][token0] = pool;
        allPairs.push(pool);
        protocolOwnedPool = pool;
        
        emit ProtocolPoolCreated(token0, token1, pool, allPairs.length);
    }
    
    /**
     * @dev Create V4 community pool
     * @param sqrtPriceX96 Initial price for the V4 pool
     */
    function createCommunityPool(uint160 sqrtPriceX96) external onlyOwner returns (address pool) {
        require(communityPool == address(0), "SleepPoolFactory: Community pool already exists");
        require(sqrtPriceX96 > 0, "SleepPoolFactory: Invalid price");
        
        // Create new V4 pool
        bytes memory bytecode = type(SleepV4Pool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(sleepToken, okbToken, "V4"));
        
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the V4 pool
        SleepV4Pool(pool).initialize(sleepToken, okbToken, treasury, sqrtPriceX96);
        
        // Update mappings
        communityPool = pool;
        
        emit CommunityPoolCreated(sleepToken, okbToken, pool, address(0));
    }
    
    /**
     * @dev Set the V4 community pool (for manual deployment)
     * @param _communityPool Address of the V4 community pool
     */
    function setCommunityPool(address _communityPool) external onlyOwner {
        require(_communityPool != address(0), "SleepPoolFactory: Invalid community pool");
        require(communityPool == address(0), "SleepPoolFactory: Community pool already set");
        
        communityPool = _communityPool;
        
        emit CommunityPoolCreated(sleepToken, okbToken, _communityPool, address(0));
    }
    
    /**
     * @dev Deploy Sleep Protocol router
     */
    function deployRouter() external onlyOwner returns (address) {
        require(protocolOwnedPool != address(0), "SleepPoolFactory: Protocol pool not created");
        require(router == address(0), "SleepPoolFactory: Router already deployed");
        
        // Deploy router with bytecode (in actual implementation, import SleepRouter)
        // For now, we'll set it manually via setRouter function
        
        emit RouterDeployed(router, protocolOwnedPool, communityPool);
        return router;
    }
    
    /**
     * @dev Set router address (temporary function for manual deployment)
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "SleepPoolFactory: Invalid router");
        router = _router;
        
        emit RouterDeployed(_router, protocolOwnedPool, communityPool);
    }
    
    /**
     * @dev Initialize both pools and mark system as ready
     */
    function initializePools() external onlyOwner {
        require(protocolOwnedPool != address(0), "SleepPoolFactory: Protocol pool not created");
        require(router != address(0), "SleepPoolFactory: Router not deployed");
        require(!poolsInitialized, "SleepPoolFactory: Already initialized");
        
        poolsInitialized = true;
        
        emit PoolsInitialized(protocolOwnedPool, communityPool);
    }
    
    // =================================================================================================
    //                                      LIQUIDITY MANAGEMENT                                            
    // =================================================================================================
    
    /**
     * @dev Add initial liquidity to protocol pool
     * @param amount0 Amount of token0 to add
     * @param amount1 Amount of token1 to add
     */
    function addProtocolLiquidity(
        uint256 amount0,
        uint256 amount1
    ) external onlyOwner nonReentrant returns (uint256 liquidity) {
        require(protocolOwnedPool != address(0), "SleepPoolFactory: Protocol pool not created");
        
        // Transfer tokens to pool
        IERC20(sleepToken).transferFrom(msg.sender, protocolOwnedPool, 
            sleepToken < okbToken ? amount0 : amount1);
        IERC20(okbToken).transferFrom(msg.sender, protocolOwnedPool, 
            sleepToken < okbToken ? amount1 : amount0);
        
        // Mint liquidity
        liquidity = ISleepPool(protocolOwnedPool).mint(address(this));
        
        emit LiquidityAdded(protocolOwnedPool, amount0, amount1, liquidity);
    }
    
    /**
     * @dev Lock protocol liquidity permanently
     */
    function lockProtocolLiquidity() external onlyOwner {
        require(protocolOwnedPool != address(0), "SleepPoolFactory: Protocol pool not created");
        SleepV2Pool(protocolOwnedPool).lockLiquidity();
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }
    
    function getPoolInfo() external view returns (
        address protocolPool,
        address communityPoolAddr,
        address hookAddr,
        bool initialized,
        uint256 totalPairs
    ) {
        protocolPool = protocolOwnedPool;
        communityPoolAddr = communityPool;
        hookAddr = v4Hook;
        initialized = poolsInitialized;
        totalPairs = allPairs.length;
    }
    
    function getProtocolPoolReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32 blockTimestampLast
    ) {
        if (protocolOwnedPool != address(0)) {
            return SleepV2Pool(protocolOwnedPool).getReserves();
        }
    }
    
    function getTaxInfo() external view returns (
        uint256 currentBuyTax,
        uint256 currentSellTax,
        uint256 stage,
        uint256 daysInStage,
        uint256 daysUntilNext
    ) {
        if (protocolOwnedPool != address(0)) {
            ISleepPool.TaxInfo memory taxInfo = ISleepPool(protocolOwnedPool).getTaxInfo();
            return (
                taxInfo.currentBuyTax,
                taxInfo.currentSellTax,
                taxInfo.stage,
                taxInfo.daysInStage,
                taxInfo.daysUntilNext
            );
        }
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Set tax exemption for an address across all pools
     */
    function setTaxExemption(address account, bool isExempt) external onlyOwner {
        if (protocolOwnedPool != address(0)) {
            ISleepPool(protocolOwnedPool).setTaxExemption(account, isExempt);
        }
        // Note: V4 hook exemptions would be set separately
    }
    
    /**
     * @dev Update treasury address across all pools
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "SleepPoolFactory: Invalid treasury");
        
        if (protocolOwnedPool != address(0)) {
            ISleepPool(protocolOwnedPool).setTreasury(newTreasury);
        }
        // Note: V4 hook treasury would be updated separately
    }
    
    /**
     * @dev Enable or disable tax system across all pools
     */
    function setTaxEnabled(bool enabled) external onlyOwner {
        if (protocolOwnedPool != address(0)) {
            ISleepPool(protocolOwnedPool).setTaxEnabled(enabled);
        }
        // Note: V4 hook tax status would be updated separately
    }
    
    // =================================================================================================
    //                                      EMERGENCY FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Emergency pause for all pools (if supported)
     */
    function emergencyPause() external onlyOwner {
        // Implementation would depend on pause mechanisms in individual pools
        // This is a placeholder for emergency controls
    }
    
    /**
     * @dev Recover accidentally sent tokens (except LP tokens)
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        require(token != protocolOwnedPool, "SleepPoolFactory: Cannot recover LP tokens");
        IERC20(token).transfer(owner(), amount);
    }
}




