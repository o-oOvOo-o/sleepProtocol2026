// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MarketTreasury
 * @dev 市场金库合约 - 存储市场手续费收入
 * 只有 owner 可以提取资金
 */
contract MarketTreasury is Ownable, ReentrancyGuard {
    // --- State Variables ---
    
    uint256 public totalDeposited;      // 累计存入金额
    uint256 public totalWithdrawn;      // 累计提取金额
    uint256 public depositCount;        // 存入次数
    uint256 public withdrawCount;       // 提取次数
    
    // --- Events ---
    
    event Deposited(address indexed from, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event EmergencyWithdraw(address indexed to, uint256 amount, uint256 timestamp);
    
    // --- Constructor ---
    
    constructor() {}
    
    // --- Public Functions ---
    
    /**
     * @dev 接收存款（任何人都可以向金库存款）
     */
    receive() external payable {
        require(msg.value > 0, "Treasury: Amount must be greater than zero");
        
        totalDeposited += msg.value;
        depositCount += 1;
        
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev 获取当前余额
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 获取金库统计信息
     */
    function getTreasuryStats() external view returns (
        uint256 currentBalance,
        uint256 _totalDeposited,
        uint256 _totalWithdrawn,
        uint256 _depositCount,
        uint256 _withdrawCount
    ) {
        return (
            address(this).balance,
            totalDeposited,
            totalWithdrawn,
            depositCount,
            withdrawCount
        );
    }
    
    // --- Owner Functions ---
    
    /**
     * @dev 提取指定金额到指定地址
     * @param _to 接收地址
     * @param _amount 提取金额
     */
    function withdraw(address payable _to, uint256 _amount) external onlyOwner nonReentrant {
        require(_to != address(0), "Treasury: Invalid recipient address");
        require(_amount > 0, "Treasury: Amount must be greater than zero");
        require(_amount <= address(this).balance, "Treasury: Insufficient balance");
        
        totalWithdrawn += _amount;
        withdrawCount += 1;
        
        _to.transfer(_amount);
        
        emit Withdrawn(_to, _amount, block.timestamp);
    }
    
    /**
     * @dev 提取所有余额到 owner
     */
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Treasury: No balance to withdraw");
        
        totalWithdrawn += balance;
        withdrawCount += 1;
        
        payable(owner()).transfer(balance);
        
        emit Withdrawn(owner(), balance, block.timestamp);
    }
    
    /**
     * @dev 紧急提取（绕过重入保护，仅在极端情况下使用）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Treasury: No balance to withdraw");
        
        totalWithdrawn += balance;
        
        payable(owner()).transfer(balance);
        
        emit EmergencyWithdraw(owner(), balance, block.timestamp);
    }
}








