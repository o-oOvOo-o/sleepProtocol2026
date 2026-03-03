// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// This is our main ERC20 token - clean and simple, without any tax logic.
contract TokenCore is ERC20, Ownable {

    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================

    // --- Addresses ---
    address public minterContract; // Address of the TokenMinter contract

    // =================================================================================================
    //                                          CONSTRUCTOR                                            
    // =================================================================================================

    constructor() ERC20("Sleep Coin", "SLEEPING") {
        // Simple constructor - no complex initialization needed
    }

    // =================================================================================================
    //                                       INTERNAL FUNCTIONS                                        
    // =================================================================================================

    // No custom transfer logic needed - using standard ERC20 transfers
    // Tax logic will be handled by custom DEX pools

    // =================================================================================================
    //                                     EXTERNAL/PUBLIC FUNCTIONS                                   
    // =================================================================================================

    function mint(address to, uint256 amount) external {
        require(msg.sender == minterContract, "SLEEP: Caller is not the minter contract");
        _mint(to, amount);
    }

    // =================================================================================================
    //                                       OWNER-ONLY FUNCTIONS                                      
    // =================================================================================================
    
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function recoverTokens(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(this), "SLEEP: Cannot recover the contract's own token.");
        IERC20(tokenAddress).transfer(owner(), amount);
    }

    function setMinterContract(address _minterAddress) external onlyOwner {
        minterContract = _minterAddress;
    }

}
