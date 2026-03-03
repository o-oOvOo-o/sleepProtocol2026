// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/ABDKMath64x64.sol";
import "./lib/Log2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/ISleepCoin.sol";
import "./interfaces/IStakingRewards.sol";
import "./interfaces/ITokenMinter.sol";
import "./pools/interfaces/ISleepRouter.sol";

interface ITokenCore {
    function mint(address to, uint256 amount) external;
}

interface ITokenTreasury {
    function receiveOkbRevenue() external payable;
}

// This contract will handle the batch minting logic and represent minting positions as NFTs.
contract TokenMinter is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    using ABDKMath64x64 for int128;

    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================

    // --- Contracts ---
    ISleepCoin public sleepToken;
    address public treasuryDistributor;
    address public stakingRewardsAddress;
    address public devWallet;

    // --- Protocol Parameters ---
    uint256 public genesisTs;
    uint256 public globalRank;
    uint256 public EAA = 100_000; // Starting EAA, can be made adjustable
    uint256 public constant SECONDS_IN_DAY = 86400;

    // --- Admin Development Controls ---
    bool public adminControlsEnabled = true; // Can be disabled after development phase
    uint256 public adminTimeOffset = 0; // Offset for protocol time adjustment

    // --- Minting Fee ---
    uint256 public mintFee;

    // --- Constants ---
    uint256 public constant WITHDRAWAL_WINDOW_DAYS = 10;
    uint256 public constant MAX_PENALTY_PCT = 99;
    uint256 public constant MAX_AMPLIFIER_DAYS = 2920; // 8 years amplifier cycle
    uint256 public constant MAX_TERM_DAYS = 3650; // 10 years maximum term
    uint256 public constant MIN_DECAY_FACTOR_SCALED = 166; // 0.00166 minimum time decay factor (scaled by 100000)


    // --- NFT Data ---
    Counters.Counter private _tokenIdCounter;

    event RankClaimed(address indexed minter, uint256 term, uint256 count, uint256 feePaid, uint256 expectedFee);
    event RewardClaimed(
        uint256 indexed tokenId, 
        address indexed claimer, 
        bool liquidated,
        uint256 rewardAmount,
        uint256 penaltyAmount
    );
    event MaturityUpdated(uint256 indexed tokenId, uint256 newMaturityTs);
    
    // Admin Development Events
    event AdminControlsDisabled();
    event MintExpiryAdjusted(uint256 indexed tokenId, uint256 newMaturityTs);
    event ProtocolTimeAdjusted(uint256 newOffset);
    event AdminMintExecuted(address indexed to, uint256 amount);

    struct MintInfo {
        uint256 maturityTs;      // Timestamp when tokens can be claimed
        uint256 term;            // The minting term in seconds
        uint256 count;           // How many minting positions are in this NFT
        uint256 rank;            // The cRank at the time of minting
        uint256 amplifier;       // The amplifier at the time of minting
        address minter;          // The original minter address
    }
    
    mapping(uint256 => MintInfo) public mintPositions;

    // =================================================================================================
    //                                          CONSTRUCTOR                                            
    // =================================================================================================

    constructor(
        address _sleepTokenAddress, 
        address _treasuryAddress,
        uint256 _mintFee
    ) ERC721("Sleep Minting Position", "SLEEP-MP") {
        genesisTs = block.timestamp;
        sleepToken = ISleepCoin(_sleepTokenAddress);
        treasuryDistributor = _treasuryAddress;
        devWallet = msg.sender;
        mintFee = _mintFee;
    }

    // =================================================================================================
    //                                     EXTERNAL/PUBLIC FUNCTIONS                                   
    // =================================================================================================
    
    function setGenesisTs(uint256 newGenesisTs) external onlyOwner {
        genesisTs = newGenesisTs;
    }

    function setMaturity(uint256 tokenId, uint256 newMaturityTs) external onlyOwner {
        require(msg.sender == devWallet, "SLEEP-MP: Caller is not the developer");
        mintPositions[tokenId].maturityTs = newMaturityTs;
        emit MaturityUpdated(tokenId, newMaturityTs);
    }

    function recoverTokens(address tokenAddress, uint256 amount) external onlyOwner {
        IERC20(tokenAddress).transfer(owner(), amount);
    }

    function setStakingRewardsAddress(address _stakingRewardsAddress) external onlyOwner {
        stakingRewardsAddress = _stakingRewardsAddress;
    }

    function setTreasuryDistributor(address _treasuryDistributor) external onlyOwner {
        require(_treasuryDistributor != address(0), "SLEEP-MP: Invalid treasury address");
        treasuryDistributor = _treasuryDistributor;
    }

    function setMintFee(uint256 _newMintFee) external onlyOwner {
        mintFee = _newMintFee;
    }

    function claimRank(uint256 term, uint256 count) external payable {
        require(count > 0 && count <= 100, "SLEEP-MP: Count must be between 1 and 100");
        require(term <= _calculateMaxTerm(), "SLEEP-MP: Term exceeds maximum allowed");
        
        uint256 expectedFee = mintFee * count;
        require(msg.value == expectedFee, "SLEEP-MP: Incorrect mint fee paid");

        // === CHECKS & EFFECTS (Re-entrancy fix) ===
        // All state changes happen BEFORE the external call.

        uint256 startingRank = globalRank + 1;
        globalRank += count;

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        mintPositions[tokenId] = MintInfo({
            maturityTs: block.timestamp + term,
            term: term,
            count: count, // Store the original batch count
            rank: startingRank, // Store the starting rank of the batch
            amplifier: _calculateRewardAmplifier(),
            minter: msg.sender
        });

        _safeMint(msg.sender, tokenId);

        // === INTERACTION (Re-entrancy fix) ===
        // External call is the last step.
        ITokenTreasury(treasuryDistributor).receiveOkbRevenue{value: msg.value}();
    }

    function claimMintReward(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "SLEEP-MP: Caller is not owner or approved");
        require(stakingRewardsAddress != address(0), "SLEEP-MP: Staking address not set");

        MintInfo storage position = mintPositions[tokenId];
        require(block.timestamp >= position.maturityTs, "SLEEP-MP: Minting term not yet mature");

        // --- Effects ---
        // Calculate original reward FIRST.
        uint256 grossReward = _calculateMintReward(position.term, position.rank, position.amplifier, position.count);

        // Calculate penalty based on how late the claim is.
        uint256 penaltyPercent = _calculatePenaltyPercent(position.maturityTs);
        
        uint256 finalRewardForMinter;
        
        if (penaltyPercent > 0) {
            uint256 penaltyAmount = (grossReward * penaltyPercent) / 100;
            finalRewardForMinter = grossReward - penaltyAmount;

            // 6% of the PENALTY amount is redistributed to stakers.
            uint256 redistributionAmount = (penaltyAmount * 6) / 100;
            if (redistributionAmount > 0) {
                sleepToken.mint(stakingRewardsAddress, redistributionAmount);
            }
        } else {
            finalRewardForMinter = grossReward;
        }

        // Delete position and burn NFT BEFORE external calls to prevent re-entrancy.
        delete mintPositions[tokenId];
        _burn(tokenId);
        
        // --- Interaction ---
        // Mint the final calculated reward to the user.
        if (finalRewardForMinter > 0) {
            sleepToken.mint(msg.sender, finalRewardForMinter);
        }
        
        emit RewardClaimed(tokenId, msg.sender, false, finalRewardForMinter, penaltyPercent);
    }

    function claimFor(uint256 tokenId) external {
        require(stakingRewardsAddress != address(0), "SLEEP-MP: Staking address not set");
        
        MintInfo storage position = mintPositions[tokenId];
        require(position.maturityTs > 0, "SLEEP-MP: NFT does not exist or has been claimed");

        // The core requirement for public liquidation: NFT must be in the 99% penalty zone.
        uint256 tenDaysInSeconds = 10 * SECONDS_IN_DAY;
        require(block.timestamp >= position.maturityTs + tenDaysInSeconds, "SLEEP-MP: NFT not yet eligible for public liquidation");

        // --- Effects ---
        uint256 grossReward = _calculateMintReward(position.term, position.rank, position.amplifier, position.count);

        // At this stage, penalty is always 99%
        uint256 penaltyAmount = (grossReward * 99) / 100;
        uint256 liquidatorReward = grossReward - penaltyAmount; // The remaining 1%

        // 6% of the PENALTY amount is redistributed to stakers.
        uint256 redistributionAmount = (penaltyAmount * 6) / 100;

        // --- Interaction Part 1: Mint rewards ---
        if (redistributionAmount > 0) {
            sleepToken.mint(stakingRewardsAddress, redistributionAmount);
        }
        if (liquidatorReward > 0) {
            sleepToken.mint(msg.sender, liquidatorReward); // Reward goes to the caller (liquidator)
        }
        
        // --- Effects Part 2: Clean up state ---
        // Delete position and burn NFT AFTER external calls, but it's safe here 
        // because the core logic is complete and there's no state to be re-entered upon.
        delete mintPositions[tokenId];
        _burn(tokenId);
        
        emit RewardClaimed(tokenId, msg.sender, true, liquidatorReward, penaltyAmount);
    }

    // =================================================================================================
    //                                      INTERNAL FUNCTIONS                                        
    // =================================================================================================

    function _calculatePenaltyPercent(uint256 maturityTs) internal view returns (uint256) {
        if (block.timestamp < maturityTs) {
            return 0;
        }

        uint256 secondsLate = block.timestamp - maturityTs;
        uint256 daysLate = secondsLate / SECONDS_IN_DAY;

        // Phase 1: Rest Period (Days 1-2 Post-Maturity) - No penalty.
        // daysLate is 0 on the first day, 1 on the second day.
        if (daysLate < 2) {
            return 0;
        }

        // Phase 2: Strategic Window (Days 3-5 Post-Maturity)
        // 5% per day linear increase. Day 3 = 5%, Day 4 = 10%, Day 5 = 15%.
        if (daysLate <= 4) { // daysLate is 2, 3, 4
            return (daysLate - 1) * 5;
        }

        // Phase 3: Wake-up Call (Days 6-9 Post-Maturity)
        // Day 6 = 30%, Day 7 = 45%, Day 8 = 60%, Day 9 = 75%
        if (daysLate <= 8) { // daysLate is 5, 6, 7, 8
            uint256 basePenalty = 15; // Penalty at Day 5 is 15%
            uint256 additionalPenalty = (daysLate - 4) * 15;
            uint256 totalPenalty = basePenalty + additionalPenalty;
            return totalPenalty;
        }

        // From Day 10 onwards, penalty is permanently 99%
        return 99;
    }

    function _calculateMaxTerm() internal view returns (uint256) {
        uint256 daysSinceGenesis = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
        
        // 8-Phase Dynamic Max Term Growth
        // Each phase lasts 365 days (1 year), growth rate doubles each year
        // 365 / 49 = 7.44... ≈ 7 increases per year
        // Phase 1: +7 days per 49 days  → 7 * 7 = 49 days growth per year
        // Phase 2: +14 days per 49 days → 7 * 14 = 98 days growth per year
        // Phase 3: +28 days per 49 days → 7 * 28 = 196 days growth per year
        // Phase 4: +56 days per 49 days → 7 * 56 = 392 days growth per year
        // Phase 5: +112 days per 49 days → 7 * 112 = 784 days growth per year
        // Phase 6: +224 days per 49 days → 7 * 224 = 1568 days growth per year
        // Phase 7: +448 days per 49 days → 7 * 448 = 3136 days growth per year
        // Phase 8: +896 days per 49 days → 7 * 896 = 6272 days growth per year
        
        uint256 maxTermDays = 49; // Base term
        
        if (daysSinceGenesis < 365) {
            // Phase 1 (Year 1): Every 49 days increases max term by 7 days
            uint256 increases = daysSinceGenesis / 49;
            maxTermDays += increases * 7;
        } else if (daysSinceGenesis < 730) {
            // Phase 2 (Year 2): Every 49 days increases by 14 days
            uint256 phase1Growth = 7 * 7; // 49 days from phase 1
            uint256 daysInPhase2 = daysSinceGenesis - 365;
            uint256 phase2Increases = daysInPhase2 / 49;
            maxTermDays += phase1Growth + (phase2Increases * 14);
        } else if (daysSinceGenesis < 1095) {
            // Phase 3 (Year 3): Every 49 days increases by 28 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 daysInPhase3 = daysSinceGenesis - 730;
            uint256 phase3Increases = daysInPhase3 / 49;
            maxTermDays += phase1Growth + phase2Growth + (phase3Increases * 28);
        } else if (daysSinceGenesis < 1460) {
            // Phase 4 (Year 4): Every 49 days increases by 56 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 daysInPhase4 = daysSinceGenesis - 1095;
            uint256 phase4Increases = daysInPhase4 / 49;
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + (phase4Increases * 56);
        } else if (daysSinceGenesis < 1825) {
            // Phase 5 (Year 5): Every 49 days increases by 112 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 phase4Growth = 7 * 56;  // 392 days
            uint256 daysInPhase5 = daysSinceGenesis - 1460;
            uint256 phase5Increases = daysInPhase5 / 49;
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + (phase5Increases * 112);
        } else if (daysSinceGenesis < 2190) {
            // Phase 6 (Year 6): Every 49 days increases by 224 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 phase4Growth = 7 * 56;  // 392 days
            uint256 phase5Growth = 7 * 112; // 784 days
            uint256 daysInPhase6 = daysSinceGenesis - 1825;
            uint256 phase6Increases = daysInPhase6 / 49;
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + (phase6Increases * 224);
        } else if (daysSinceGenesis < 2555) {
            // Phase 7 (Year 7): Every 49 days increases by 448 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 phase4Growth = 7 * 56;  // 392 days
            uint256 phase5Growth = 7 * 112; // 784 days
            uint256 phase6Growth = 7 * 224; // 1568 days
            uint256 daysInPhase7 = daysSinceGenesis - 2190;
            uint256 phase7Increases = daysInPhase7 / 49;
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + phase6Growth + (phase7Increases * 448);
        } else if (daysSinceGenesis < 2920) {
            // Phase 8 (Year 8): Every 49 days increases by 896 days
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 phase4Growth = 7 * 56;  // 392 days
            uint256 phase5Growth = 7 * 112; // 784 days
            uint256 phase6Growth = 7 * 224; // 1568 days
            uint256 phase7Growth = 7 * 448; // 3136 days
            uint256 daysInPhase8 = daysSinceGenesis - 2555;
            uint256 phase8Increases = daysInPhase8 / 49;
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + phase6Growth + phase7Growth + (phase8Increases * 896);
        } else {
            // After 8 years, use maximum calculated term
            uint256 phase1Growth = 7 * 7;   // 49 days
            uint256 phase2Growth = 7 * 14;  // 98 days
            uint256 phase3Growth = 7 * 28;  // 196 days
            uint256 phase4Growth = 7 * 56;  // 392 days
            uint256 phase5Growth = 7 * 112; // 784 days
            uint256 phase6Growth = 7 * 224; // 1568 days
            uint256 phase7Growth = 7 * 448; // 3136 days
            uint256 phase8Growth = 7 * 896; // 6272 days
            maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + phase6Growth + phase7Growth + phase8Growth;
        }
        
        // Cap at 3650 days (10 years) for extreme long-term commitment
        if (maxTermDays > 3650) {
            maxTermDays = 3650;
        }
        
        return maxTermDays * SECONDS_IN_DAY;
    }

    function _calculateTimeDecayFactor() internal view returns (int128) {
        uint256 daysSinceGenesis = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
        // e^(-0.0016 * t) -> -0.0016 is approx -16000/10000000 as int128
        int128 exponent = ABDKMath64x64.fromInt(-16000).divi(10000000).muli(int128(int256(daysSinceGenesis)));
        int128 decayFactor = exponent.exp();
        
        // Set minimum decay factor to 0.00166 to ensure protocol never completely dies
        // This preserves mint capability for future scenarios (e.g., massive token burns)
        int128 minDecayFactor = ABDKMath64x64.fromUInt(166).divi(100000); // 0.00166
        
        return decayFactor > minDecayFactor ? decayFactor : minDecayFactor;
    }
    
    function _calculateRewardAmplifier() internal view returns (uint256) {
        uint256 daysSinceGenesis = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
        
        // XEN-style snapshot amplifier: starts at 2920, decreases by 1 per day
        // After 2920 days (8 years), it becomes 1 (minimum)
        if (daysSinceGenesis >= 2920) {
            return 1;
        }
        
        return 2920 - daysSinceGenesis;
    }

    function _calculateMintReward(uint256 term, uint256 cRank, uint256 amplifier, uint256 count) internal view returns (uint256) {
        uint256 totalGrossReward = 0;

        for (uint i = 0; i < count; i++) {
            uint256 currentRank = cRank + i;
            uint256 rankDelta = globalRank > currentRank ? globalRank - currentRank : 0;
            
            if (rankDelta < 2) {
                rankDelta = 2;
            }
            
            uint256 rankDiff = Log2.log2(rankDelta);
            
            // Summing up the gross reward for each unit in the batch
            totalGrossReward += (rankDiff * amplifier * term * EAA) / 1_000_000;
        }

        int128 timeDecayFactor = _calculateTimeDecayFactor();
        uint256 totalDecayedReward = ABDKMath64x64.fromUInt(totalGrossReward).mul(timeDecayFactor).toUInt();

        return totalDecayedReward;
    }


    // =================================================================================================
    //                                     ERC721 OVERRIDES                                            
    // =================================================================================================

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _getNftStatus(uint256 tokenId) internal view returns (string memory) {
        MintInfo storage position = mintPositions[tokenId];
        if (position.maturityTs == 0) {
            return "liquidated"; // Or some other status for claimed/non-existent
        }

        if (block.timestamp < position.maturityTs) {
            return "active";
        }

        uint256 tenDaysInSeconds = 10 * SECONDS_IN_DAY;
        if (block.timestamp >= position.maturityTs + tenDaysInSeconds) {
            return "liquidated";
        }

        if (_calculatePenaltyPercent(position.maturityTs) > 0) {
            return "penalty";
        }

        return "mature";
    }

    function _buildSvg(uint256 tokenId) internal view returns (string memory) {
        MintInfo storage position = mintPositions[tokenId];
        string memory status = _getNftStatus(tokenId);

        string[2] memory bgGradient;
        string memory statusText;
        string memory statusColor;

        if (keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("active"))) {
            bgGradient = ['#3B82F6', '#6366F1'];
            statusText = 'ACTIVE';
            statusColor = '#93C5FD';
        } else if (keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("mature"))) {
            bgGradient = ['#10B981', '#14B8A6'];
            statusText = 'MATURE';
            statusColor = '#A7F3D0';
        } else if (keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("penalty"))) {
            bgGradient = ['#F59E0B', '#F97316'];
            statusText = 'PENALTY';
            statusColor = '#FDE68A';
        } else { // liquidated
            bgGradient = ['#EF4444', '#DC2626'];
            statusText = 'LIQUIDATED';
            statusColor = '#FECACA';
        }

        string memory svg = string(abi.encodePacked(
            '<svg width="256" height="384" viewBox="0 0 256 384" fill="none" xmlns="http://www.w3.org/2000/svg">',
            '<defs>',
                '<linearGradient id="background" x1="0" y1="0" x2="256" y2="384">',
                    '<stop offset="0%" stop-color="', bgGradient[0], '" />',
                    '<stop offset="100%" stop-color="', bgGradient[1], '" />',
                '</linearGradient>',
                '<style>',
                    '.title { font: bold 24px sans-serif; fill: white; }',
                    '.subtitle { font: normal 14px sans-serif; fill: white; opacity: 0.8; }',
                    '.label { font: normal 12px sans-serif; fill: white; opacity: 0.8; }',
                    '.value { font: bold 18px sans-serif; fill: white; }',
                    '.status-badge { font: bold 10px sans-serif; fill: #1F2937; }',
                '</style>',
            '</defs>',
            '<rect width="256" height="384" rx="16" fill="url(#background)" />',
            '<g transform="translate(16, 24)">',
                '<text class="title">NFT #', Strings.toString(tokenId), '</text>',
                '<text y="20" class="subtitle">SLEEP PROTOCOL</text>',
            '</g>',
            '<rect x="150" y="24" width="90" height="24" rx="12" fill="', statusColor, '" />',
            '<text x="195" y="41" text-anchor="middle" class="status-badge">', statusText, '</text>',
            '<g transform="translate(16, 300)">',
                '<text class="label">Term</text>',
                '<text y="20" class="value">', Strings.toString(position.term / SECONDS_IN_DAY), ' Days</text>',
                '<text y="50" class="label">Units</text>',
                '<text y="70" class="value">', Strings.toString(position.count), '</text>',
            '</g>',
            '</svg>'
        ));

        return svg;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        MintInfo storage position = mintPositions[tokenId];
        string memory status = _getNftStatus(tokenId);
        string memory svg = _buildSvg(tokenId);

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{',
                '"name": "Sleep NFT #', Strings.toString(tokenId), '",',
                '"description": "A fully on-chain NFT from the Sleep Protocol, with its appearance and state determined by its on-chain data.",',
                '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                '"attributes": [',
                    '{ "trait_type": "Rank", "value": ', Strings.toString(position.rank), ' },',
                    '{ "trait_type": "Term", "value": ', Strings.toString(position.term / SECONDS_IN_DAY), ' },',
                    '{ "trait_type": "Units", "value": ', Strings.toString(position.count), ' },',
                    '{ "trait_type": "Status", "value": "', status, '" }',
                ']',
            '}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // =================================================================================================
    //                                   ADMIN DEVELOPMENT FUNCTIONS                                 
    // =================================================================================================

    modifier onlyAdminDev() {
        require(adminControlsEnabled && msg.sender == owner(), "Admin controls disabled or not owner");
        _;
    }

    /**
     * @dev Disable admin controls permanently (for production deployment)
     */
    function disableAdminControls() external onlyOwner {
        adminControlsEnabled = false;
        emit AdminControlsDisabled();
    }

    /**
     * @dev Adjust mint expiry time for testing purposes
     * @param tokenId The NFT token ID to adjust
     * @param newMaturityTs New maturity timestamp
     */
    function adjustMintExpiry(uint256 tokenId, uint256 newMaturityTs) external onlyAdminDev {
        require(_exists(tokenId), "Token does not exist");
        require(newMaturityTs > block.timestamp, "New maturity must be in future");
        
        mintPositions[tokenId].maturityTs = newMaturityTs;
        emit MintExpiryAdjusted(tokenId, newMaturityTs);
    }

    /**
     * @dev Adjust protocol time for testing purposes
     * @param offsetSeconds Time offset in seconds (can be negative)
     */
    function adjustProtocolTime(int256 offsetSeconds) external onlyAdminDev {
        if (offsetSeconds >= 0) {
            adminTimeOffset = uint256(offsetSeconds);
        } else {
            // Handle negative offset
            uint256 absOffset = uint256(-offsetSeconds);
            if (absOffset <= adminTimeOffset) {
                adminTimeOffset -= absOffset;
            } else {
                adminTimeOffset = 0;
            }
        }
        emit ProtocolTimeAdjusted(adminTimeOffset);
    }

    /**
     * @dev Direct mint SLEEP tokens to owner wallet for testing
     * @param amount Amount of tokens to mint (in wei)
     */
    function adminMintTokens(uint256 amount) external onlyAdminDev {
        require(amount > 0, "Amount must be greater than 0");
        
        // Mint tokens directly to owner
        sleepToken.mint(owner(), amount);
        emit AdminMintExecuted(owner(), amount);
    }

    /**
     * @dev Get adjusted protocol time (current time + admin offset)
     */
    function getAdjustedTime() public view returns (uint256) {
        return block.timestamp + adminTimeOffset;
    }

    /**
     * @dev Get days since genesis with admin time adjustment
     */
    function getAdjustedDaysSinceGenesis() public view returns (uint256) {
        if (genesisTs == 0) return 0;
        uint256 adjustedTime = getAdjustedTime();
        if (adjustedTime <= genesisTs) return 0;
        return (adjustedTime - genesisTs) / SECONDS_IN_DAY;
    }
}
