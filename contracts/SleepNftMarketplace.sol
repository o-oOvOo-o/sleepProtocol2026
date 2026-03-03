// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract SleepNftMarketplace is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    // --- State Variables ---

    struct Listing {
        uint256 price; // Price in WEI (for OKB)
        address seller;
    }

    // Mapping from NFT contract address to token ID to Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // Set of whitelisted (allowed) NFT contracts
    EnumerableSet.AddressSet private whitelistedNftContracts;

    uint256 public marketplaceFeePercent; // Fee in basis points (e.g., 50 = 0.5%)
    address payable public treasury;      // Treasury contract address
    
    uint256 public totalVolume;           // 总交易额
    uint256 public totalFees;             // 累计手续费
    uint256 public totalSales;            // 总交易笔数
    
    // --- Events ---

    event NFTListed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 fee
    );
    event NFTDelisted(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event NftContractWhitelisted(address indexed nftContract);
    event NftContractRemoved(address indexed nftContract);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // --- Constructor ---

    constructor() Ownable() {
        marketplaceFeePercent = 50; // Set default fee to 0.5% (50 basis points)
    }

    // --- Whitelist Management (Owner only) ---

    function addNftContract(address _nftContract) external onlyOwner {
        require(_nftContract != address(0), "Marketplace: Zero address");
        require(whitelistedNftContracts.add(_nftContract), "Marketplace: Contract already whitelisted");
        emit NftContractWhitelisted(_nftContract);
    }

    function removeNftContract(address _nftContract) external onlyOwner {
        require(whitelistedNftContracts.remove(_nftContract), "Marketplace: Contract not whitelisted");
        emit NftContractRemoved(_nftContract);
    }

    function isWhitelisted(address _nftContract) public view returns (bool) {
        return whitelistedNftContracts.contains(_nftContract);
    }
    
    function getWhitelistedContracts() public view returns (address[] memory) {
        return whitelistedNftContracts.values();
    }

    // === View Functions ===
    
    function getListing(address _nftContract, uint256 _tokenId) public view returns (address seller, uint256 price, bool active) {
        Listing memory listing = listings[_nftContract][_tokenId];
        return (listing.seller, listing.price, listing.price > 0);
    }
    
    function isListed(address _nftContract, uint256 _tokenId) public view returns (bool) {
        return listings[_nftContract][_tokenId].price > 0;
    }

    // --- Core Functions ---

    function listNFT(address _nftContract, uint256 _tokenId, uint256 _price) external nonReentrant {
        require(isWhitelisted(_nftContract), "Marketplace: NFT contract not whitelisted");
        require(_price > 0, "Marketplace: Price must be greater than zero");
        
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Marketplace: You are not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || nft.getApproved(_tokenId) == address(this),
            "Marketplace: Contract not approved"
        );

        listings[_nftContract][_tokenId] = Listing({price: _price, seller: msg.sender});

        emit NFTListed(_nftContract, _tokenId, msg.sender, _price);
    }

    function buyNFT(address _nftContract, uint256 _tokenId) external payable nonReentrant {
        require(isWhitelisted(_nftContract), "Marketplace: NFT contract not whitelisted");
        
        Listing memory listing = listings[_nftContract][_tokenId];
        require(listing.price > 0, "Marketplace: Not listed for sale");
        require(msg.sender != listing.seller, "Marketplace: Cannot buy your own NFT");
        require(msg.value == listing.price, "Marketplace: Incorrect amount sent");

        address seller = listing.seller;

        delete listings[_nftContract][_tokenId];

        uint256 fee = (msg.value * marketplaceFeePercent) / 10000;
        
        // 更新统计数据
        totalVolume += msg.value;
        totalFees += fee;
        totalSales += 1;
        
        // 手续费发送到金库（如果设置了金库地址）
        if (fee > 0) {
            if (treasury != address(0)) {
                (bool success, ) = treasury.call{value: fee}("");
                require(success, "Marketplace: Fee transfer to treasury failed");
            } else {
                (bool success, ) = payable(owner()).call{value: fee}("");
                require(success, "Marketplace: Fee transfer to owner failed");
            }
        }

        uint256 sellerProceeds = msg.value - fee;
        (bool success, ) = payable(seller).call{value: sellerProceeds}("");
        require(success, "Marketplace: Payment to seller failed");

        IERC721(_nftContract).safeTransferFrom(seller, msg.sender, _tokenId);

        emit NFTSold(_nftContract, _tokenId, seller, msg.sender, msg.value, fee);
    }

    function delistNFT(address _nftContract, uint256 _tokenId) external {
        require(isWhitelisted(_nftContract), "Marketplace: NFT contract not whitelisted");
        
        Listing memory listing = listings[_nftContract][_tokenId];
        require(listing.seller == msg.sender, "Marketplace: You are not the seller");

        delete listings[_nftContract][_tokenId];

        emit NFTDelisted(_nftContract, _tokenId, msg.sender);
    }

    // --- Admin Functions ---

    function setMarketplaceFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "Marketplace: Fee cannot exceed 10%"); // Max fee 10%
        uint256 oldFee = marketplaceFeePercent;
        marketplaceFeePercent = _newFeePercent;
        emit MarketplaceFeeUpdated(oldFee, _newFeePercent);
    }
    
    function setTreasury(address payable _treasury) external onlyOwner {
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    function getMarketStats() external view returns (
        uint256 _totalVolume,
        uint256 _totalFees,
        uint256 _totalSales,
        uint256 _feePercent,
        address _treasury
    ) {
        return (
            totalVolume,
            totalFees,
            totalSales,
            marketplaceFeePercent,
            treasury
        );
    }

    function emergencyWithdraw() external onlyOwner nonReentrant {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Marketplace: Emergency withdrawal failed");
    }
}
