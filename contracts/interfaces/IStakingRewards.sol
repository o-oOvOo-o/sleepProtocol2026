// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IStakingRewards {
    event Staked(address indexed user, uint256 tokenId, uint256 amount);
    event Withdrawn(address indexed user, uint256 tokenId, uint256 amount);
    
    function registerStake(address user, uint256 tokenId, uint256 amount, uint256 stakingDays, bool isInfinite) external;
    function deregisterDeposit(address user, uint256 tokenId, uint256 depositIndex) external;
    // function setStakingPeriod(uint256 tokenId, uint256 depositIndex, uint256 stakingDays, bool isInfinite) external; // DEPRECATED
    function updateStakerAddress(uint256 tokenId, address oldOwner, address newOwner) external;
    function claimAllRewards(uint256 tokenId) external;
    
    // View functions that might be useful for other contracts (like Access Pass for metadata)
    function getNftStakingSummary(uint256 tokenId) external view returns (uint256, uint256, uint256, uint256);
    function getPendingRewards(uint256 tokenId) external view returns (uint256 claimableRewards, uint256 pendingRewards);
    // function getClaimableOkbRewards(uint256 tokenId) external view returns (uint256, DividendPeriod[5] memory, uint256[] memory); // DEPRECATED
    function getClaimableSleepRewards(uint256 tokenId) external view returns (uint256, DividendPeriod[4] memory, uint256[] memory);

    // This is a placeholder for the enum, as interfaces can't declare them.
    // The calling contract will need to have the enum defined itself.
    enum DividendPeriod { SIX_DAYS, THIRTY_DAYS, NINETY_DAYS, THREESIXTY_DAYS, SEVENTY_TWENTY_DAYS }
}
