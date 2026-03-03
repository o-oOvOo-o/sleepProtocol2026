// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Remove the ISleepCoin interface as we are switching to native OKB
// interface ISleepCoin {
//     function transferFrom(address from, address to, uint256 amount) external returns (bool);
// }

contract NftMarketplace is Ownable, ReentrancyGuard {
    // --- State Variables ---

    struct Listing {
        uint256 price; // Price in WEI (for OKB)
        address seller;
    }

    IERC721 public immutable sleepNft;
    // ISleepCoin public immutable sleepCoin; // Removed

    mapping(uint256 => Listing) public listings;
    uint256 public marketplaceFeePercent; // Fee in basis points (e.g., 50 = 0.5%)
    
    // --- Admin Development Controls ---
    bool public adminControlsEnabled = true; // Can be disabled after development phase

    // --- Events ---

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 fee
    );
    event NFTDelisted(uint256 indexed tokenId, address indexed seller);
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    
    // Admin Development Events
    event AdminControlsDisabled();
    event AdminFeeAdjusted(uint256 oldFee, uint256 newFee);

    // --- Constructor ---

    constructor(address _sleepNftAddress) Ownable() {
        sleepNft = IERC721(_sleepNftAddress);
        marketplaceFeePercent = 50; // Set default fee to 0.5% (50 basis points)
    }

    // --- Core Functions ---

    function listNFT(uint256 _tokenId, uint256 _price) external nonReentrant {
        require(_price > 0, "MARKETPLACE: Price must be greater than zero");
        require(
            sleepNft.ownerOf(_tokenId) == msg.sender,
            "MARKETPLACE: You are not the owner of this NFT"
        );
        require(
            sleepNft.isApprovedForAll(msg.sender, address(this)) ||
                sleepNft.getApproved(_tokenId) == address(this),
            "MARKETPLACE: Contract not approved to manage this NFT"
        );

        listings[_tokenId] = Listing({price: _price, seller: msg.sender});

        emit NFTListed(_tokenId, msg.sender, _price);
    }

    function buyNFT(uint256 _tokenId) external payable nonReentrant {
        Listing memory listing = listings[_tokenId];
        require(listing.price > 0, "MARKETPLACE: NFT not listed for sale");
        require(
            msg.sender != listing.seller,
            "MARKETPLACE: Cannot buy your own NFT"
        );
        require(
            msg.value == listing.price,
            "MARKETPLACE: Incorrect amount of OKB sent"
        );

        address seller = listing.seller;

        // Clear the listing before transfers to prevent re-entrancy issues
        delete listings[_tokenId];

        // Calculate and transfer fees
        uint256 fee = (msg.value * marketplaceFeePercent) / 10000;
        if (fee > 0) {
            payable(owner()).transfer(fee);
        }

        // Transfer payment to seller
        uint256 sellerProceeds = msg.value - fee;
        payable(seller).transfer(sellerProceeds);

        // Transfer the NFT
        sleepNft.safeTransferFrom(seller, msg.sender, _tokenId);

        emit NFTSold(_tokenId, seller, msg.sender, msg.value, fee);
    }

    function delistNFT(uint256 _tokenId) external {
        Listing memory listing = listings[_tokenId];
        require(
            listing.seller == msg.sender,
            "MARKETPLACE: You are not the seller of this NFT"
        );

        delete listings[_tokenId];
        emit NFTDelisted(_tokenId, msg.sender);
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
     * @dev Admin function to adjust marketplace fee for testing
     * @param _newFeePercent New fee percentage in basis points (max 1000 = 10%)
     */
    function adminAdjustMarketplaceFee(uint256 _newFeePercent) external onlyAdminDev {
        require(_newFeePercent <= 1000, "Fee cannot exceed 10% in dev mode");
        uint256 oldFee = marketplaceFeePercent;
        marketplaceFeePercent = _newFeePercent;
        emit AdminFeeAdjusted(oldFee, _newFeePercent);
    }

    // --- Admin Functions ---

    function setMarketplaceFee(uint256 _newFeePercent) external onlyOwner {
        require(
            _newFeePercent <= 500,
            "MARKETPLACE: Fee cannot exceed 5%"
        ); // Max fee 5%
        uint256 oldFee = marketplaceFeePercent;
        marketplaceFeePercent = _newFeePercent;
        emit MarketplaceFeeUpdated(oldFee, _newFeePercent);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "MARKETPLACE: No funds to withdraw");
        payable(owner()).transfer(balance);
        emit EmergencyWithdraw(owner(), balance);
    }
}
