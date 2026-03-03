// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IDevSupport {
    function checkDevSupport(uint256 tokenId) external view returns (bool);
    function checkDevSupportAmount(uint256 tokenId) external view returns (uint256);
    function totalSupportReceived() external view returns (uint256);
    
    // Extended functions for dynamic NFT data
    function getDevSupportTier(uint256 tokenId) external view returns (string memory);
    function getSupportPercentage(uint256 tokenId) external view returns (uint256);
}
