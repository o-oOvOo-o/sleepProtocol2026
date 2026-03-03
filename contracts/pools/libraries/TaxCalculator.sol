// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title TaxCalculator
 * @dev Library for calculating dynamic tax rates based on Sleep Protocol's 4-stage model
 */
library TaxCalculator {
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant DAYS_IN_6_MONTHS = 182;  // ~6 months
    uint256 public constant DAYS_IN_12_MONTHS = 365; // ~12 months  
    uint256 public constant DAYS_IN_18_MONTHS = 547; // ~18 months
    
    // Tax rate basis points (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;
    
    // Stage 1: 0-6 months
    uint256 public constant STAGE1_BUY_TAX = 200;   // 2%
    uint256 public constant STAGE1_SELL_TAX = 500;  // 5%
    
    // Stage 2: 6-12 months  
    uint256 public constant STAGE2_BUY_TAX = 200;   // 2%
    uint256 public constant STAGE2_SELL_TAX = 400;  // 4%
    
    // Stage 3: 12-18 months
    uint256 public constant STAGE3_BUY_TAX = 100;   // 1%
    uint256 public constant STAGE3_SELL_TAX = 300;  // 3%
    
    // Stage 4: 18+ months
    uint256 public constant STAGE4_BUY_TAX = 0;     // 0%
    uint256 public constant STAGE4_SELL_TAX = 0;    // 0%
    
    // =================================================================================================
    //                                      STRUCTS                                            
    // =================================================================================================
    
    struct TaxRates {
        uint256 buyTax;   // Buy tax in basis points
        uint256 sellTax;  // Sell tax in basis points
        uint256 stage;    // Current stage (1-4)
    }
    
    // =================================================================================================
    //                                      FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Calculate current tax rates based on time elapsed since genesis
     * @param genesisTimestamp The protocol genesis timestamp
     * @return rates Current tax rates and stage
     */
    function getCurrentTaxRates(uint256 genesisTimestamp) 
        internal 
        view 
        returns (TaxRates memory rates) 
    {
        // Security: Validate timestamp
        require(genesisTimestamp > 0, "TaxCalculator: Invalid genesis timestamp");
        require(block.timestamp >= genesisTimestamp, "TaxCalculator: Future genesis not allowed");
        
        uint256 daysSinceGenesis = (block.timestamp - genesisTimestamp) / SECONDS_IN_DAY;
        
        if (daysSinceGenesis < DAYS_IN_6_MONTHS) {
            // Stage 1: 0-6 months
            rates.buyTax = STAGE1_BUY_TAX;
            rates.sellTax = STAGE1_SELL_TAX;
            rates.stage = 1;
        } else if (daysSinceGenesis < DAYS_IN_12_MONTHS) {
            // Stage 2: 6-12 months
            rates.buyTax = STAGE2_BUY_TAX;
            rates.sellTax = STAGE2_SELL_TAX;
            rates.stage = 2;
        } else if (daysSinceGenesis < DAYS_IN_18_MONTHS) {
            // Stage 3: 12-18 months
            rates.buyTax = STAGE3_BUY_TAX;
            rates.sellTax = STAGE3_SELL_TAX;
            rates.stage = 3;
        } else {
            // Stage 4: 18+ months
            rates.buyTax = STAGE4_BUY_TAX;
            rates.sellTax = STAGE4_SELL_TAX;
            rates.stage = 4;
        }
    }
    
    /**
     * @dev Calculate tax amount for a given trade
     * @param amount The trade amount
     * @param taxRate The tax rate in basis points
     * @return taxAmount The calculated tax amount
     */
    function calculateTaxAmount(uint256 amount, uint256 taxRate) 
        internal 
        pure 
        returns (uint256 taxAmount) 
    {
        taxAmount = (amount * taxRate) / BASIS_POINTS;
    }
    
    /**
     * @dev Check if an address is exempt from taxes
     * @param trader The trader address
     * @param exemptAddresses Mapping of exempt addresses
     * @return isExempt Whether the address is exempt
     */
    function isExemptFromTax(
        address trader, 
        mapping(address => bool) storage exemptAddresses
    ) internal view returns (bool isExempt) {
        isExempt = exemptAddresses[trader];
    }
    
    /**
     * @dev Calculate net amount after tax deduction
     * @param grossAmount The gross trade amount
     * @param taxAmount The tax amount to deduct
     * @return netAmount The net amount after tax
     */
    function calculateNetAmount(uint256 grossAmount, uint256 taxAmount) 
        internal 
        pure 
        returns (uint256 netAmount) 
    {
        require(grossAmount >= taxAmount, "TaxCalculator: Tax exceeds amount");
        netAmount = grossAmount - taxAmount;
    }
    
    /**
     * @dev Get tax stage info for display purposes
     * @param genesisTimestamp The protocol genesis timestamp
     * @return stage Current stage number
     * @return daysInStage Days elapsed in current stage
     * @return daysUntilNext Days until next stage (0 if final stage)
     */
    function getTaxStageInfo(uint256 genesisTimestamp) 
        internal 
        view 
        returns (
            uint256 stage, 
            uint256 daysInStage, 
            uint256 daysUntilNext
        ) 
    {
        // Security: Validate timestamp
        require(genesisTimestamp > 0, "TaxCalculator: Invalid genesis timestamp");
        require(block.timestamp >= genesisTimestamp, "TaxCalculator: Future genesis not allowed");
        
        uint256 daysSinceGenesis = (block.timestamp - genesisTimestamp) / SECONDS_IN_DAY;
        
        if (daysSinceGenesis < DAYS_IN_6_MONTHS) {
            stage = 1;
            daysInStage = daysSinceGenesis;
            daysUntilNext = DAYS_IN_6_MONTHS - daysSinceGenesis;
        } else if (daysSinceGenesis < DAYS_IN_12_MONTHS) {
            stage = 2;
            daysInStage = daysSinceGenesis - DAYS_IN_6_MONTHS;
            daysUntilNext = DAYS_IN_12_MONTHS - daysSinceGenesis;
        } else if (daysSinceGenesis < DAYS_IN_18_MONTHS) {
            stage = 3;
            daysInStage = daysSinceGenesis - DAYS_IN_12_MONTHS;
            daysUntilNext = DAYS_IN_18_MONTHS - daysSinceGenesis;
        } else {
            stage = 4;
            daysInStage = daysSinceGenesis - DAYS_IN_18_MONTHS;
            daysUntilNext = 0; // Final stage
        }
    }
}
