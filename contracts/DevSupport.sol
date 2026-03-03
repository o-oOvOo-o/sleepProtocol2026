// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DevSupport
 * @dev Handles optional dev support payments for On Chain Infinite Company.
 *      This contract is separate from the Sleep Protocol's core logic.
 */
contract DevSupport is Ownable, ReentrancyGuard {

    // --- Constants ---
    uint256 public constant MIN_DEV_SUPPORT_FEE = 0.1 ether;
    uint256 public constant MAX_DEV_SUPPORT_FEE = 1.0 ether;

    // --- State Variables ---
    address public accessPassContract;
    mapping(uint256 => uint256) public devSupportAmount;
    uint256 public totalSupporters;
    uint256 public totalSupportReceived; // Total OKB received
    address[] public supporters; // Array to track all supporters

    // --- Events ---
    event DevSupportPaid(
        uint256 indexed tokenId, 
        address indexed supporter, 
        uint256 amount
    );
    event AccessPassContractUpdated(address indexed newContract);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    // ===================================================================
    constructor() {}
    
    /**
     * @dev 为 Access Pass 支付 Dev Support 费用
     * @param tokenId Access Pass 的 token ID
     */
    function payDevSupport(uint256 tokenId) external payable nonReentrant {
        require(accessPassContract != address(0), "DevSupport: Access Pass contract not set");
        require(msg.sender == tx.origin, "DevSupport: Caller cannot be a contract");
        require(
            msg.value >= MIN_DEV_SUPPORT_FEE && msg.value <= MAX_DEV_SUPPORT_FEE,
            "DevSupport: Amount is outside the allowed range (0.1 - 1.0 OKB)"
        );
        require(devSupportAmount[tokenId] == 0, "DevSupport: This NFT is already a supporter");

        // --- Effects ---
        devSupportAmount[tokenId] = msg.value;
        totalSupporters++;
        totalSupportReceived += msg.value;
        supporters.push(msg.sender); // 维护supporters数组

        // --- Interaction ---
        // Transfer the funds to the owner/dev wallet
        (bool success, ) = owner().call{value: msg.value}("");
        require(success, "DevSupport: Fund transfer failed");

        emit DevSupportPaid(tokenId, msg.sender, msg.value);
    }
    
    /**
     * @dev 检查某个 Access Pass 的支持金额
     * @param tokenId Access Pass 的 token ID
     * @return uint256 支持金额（0表示未支持）
     */
    function checkDevSupportAmount(uint256 tokenId) external view returns (uint256) {
        return devSupportAmount[tokenId];
    }
    
    /**
     * @dev 检查某个 Access Pass 是否支持了开发团队
     * @param tokenId Access Pass 的 token ID
     * @return bool 是否支持了开发团队
     */
    function checkDevSupport(uint256 tokenId) external view returns (bool) {
        return devSupportAmount[tokenId] > 0;
    }
    
    /**
     * @dev 获取支持者总数
     */
    function getSupportersCount() external view returns (uint256) {
        return supporters.length;
    }
    
    /**
     * @dev 提取收集的资金（仅限所有者）
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "DevSupport: No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "DevSupport: Transfer failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    /**
     * @dev 获取合约余额
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
