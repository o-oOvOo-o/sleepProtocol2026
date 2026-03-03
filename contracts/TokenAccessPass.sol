// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IDevSupport.sol";
import "./interfaces/IStakingRewards.sol";
import "./lib/SVGUtils.sol";

contract TokenAccessPass is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIdCounter;
    
    // --- Contract Addresses ---
    IERC20 public sleepToken;
    IStakingRewards public stakingRewardsContract;
    address public devSupportContract;
    
    // --- Locking Data ---
    mapping(uint256 => uint256) public lockedAmounts;
    mapping(uint256 => uint256) public lockTimestamps;
    mapping(uint256 => uint256) public permanentlyLockedAmounts;

    // --- SVG Data ---
    mapping(uint256 => string) private _tokenSVGs;
    
    // --- Events ---
    event AccessPassMinted(address indexed to, uint256 indexed tokenId);
    event DevSupportContractUpdated(address indexed newContract);
    event StakingRewardsContractUpdated(address indexed newContract);
    event SleepTokenAddressUpdated(address indexed newAddress);
    event Locked(uint256 indexed tokenId, address indexed user, uint256 amount);
    event Unlocked(uint256 indexed tokenId, address indexed user, uint256 amount);
    event PermanentlyLocked(uint256 indexed tokenId, address indexed user, uint256 amount);
    
    constructor() ERC721("Sleep Protocol Access Pass", "SPAP") {}
    
    function lockTokens(uint256 tokenId, uint256 amount, uint256 stakingDays, bool isInfinite) external {
        require(ownerOf(tokenId) == msg.sender, "SPAP: Not the owner");
        require(address(sleepToken) != address(0), "SPAP: SLEEP token not set");
        require(amount > 0, "SPAP: Cannot lock 0");

        if (lockTimestamps[tokenId] == 0) {
            lockTimestamps[tokenId] = block.timestamp;
        }
        lockedAmounts[tokenId] += amount;

        sleepToken.approve(address(stakingRewardsContract), amount);
        
        if (address(stakingRewardsContract) != address(0)) {
            stakingRewardsContract.registerStake(msg.sender, tokenId, amount, stakingDays, isInfinite);
        }

        emit Locked(tokenId, msg.sender, amount);
    }

    function deregisterDeposit(uint256 tokenId, uint256 depositIndex) external {
        require(ownerOf(tokenId) == msg.sender, "SPAP: Not the owner");
        require(depositIndex < 6, "SPAP: Invalid deposit index");

        if (address(stakingRewardsContract) != address(0)) {
            stakingRewardsContract.deregisterDeposit(msg.sender, tokenId, depositIndex);
        }
        emit Unlocked(tokenId, msg.sender, 0);
    }
    
    function getLockingInfo(uint256 tokenId) external view returns (
        uint256 totalLocked,
        uint256 permanentlyLocked,
        uint256 lockStartTime
    ) {
        totalLocked = lockedAmounts[tokenId];
        permanentlyLocked = permanentlyLockedAmounts[tokenId];
        lockStartTime = lockTimestamps[tokenId];
    }

    function mintAccessPass(string calldata svgData) external {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _tokenSVGs[tokenId] = svgData;
        _safeMint(msg.sender, tokenId);
        emit AccessPassMinted(msg.sender, tokenId);
    }
    
    function setAddresses(address _stakingRewards, address _sleepToken) external onlyOwner {
        require(_stakingRewards != address(0) && _sleepToken != address(0), "SPAP: Zero address");
        stakingRewardsContract = IStakingRewards(_stakingRewards);
        emit StakingRewardsContractUpdated(_stakingRewards);
        sleepToken = IERC20(_sleepToken);
        emit SleepTokenAddressUpdated(_sleepToken);
    }

    function setDevSupportContract(address _devSupportContract) external onlyOwner {
        devSupportContract = _devSupportContract;
        emit DevSupportContractUpdated(_devSupportContract);
    }
    
    function isDevSupported(uint256 tokenId) public view returns (bool) {
        if (devSupportContract == address(0)) return false;
        return IDevSupport(devSupportContract).checkDevSupport(tokenId);
    }
    
    function getDevSupportAmount(uint256 tokenId) public view returns (uint256) {
        if (devSupportContract == address(0)) return 0;
        return IDevSupport(devSupportContract).checkDevSupportAmount(tokenId);
    }
    
    function getSVG(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "SleepAccessPass: Token does not exist");
        return _injectDynamicData(_tokenSVGs[tokenId], tokenId);
    }

    function _injectDynamicData(string memory baseSvg, uint256 tokenId) internal view returns (string memory) {
        string memory renderedSvg = baseSvg;
        
        if (address(stakingRewardsContract) != address(0)) {
            (uint256 claimableOkb, uint256 pendingOkb) = stakingRewardsContract.getPendingRewards(tokenId);
            uint256 totalOkbReward = claimableOkb + pendingOkb;
            (uint256 sleepReward,,) = stakingRewardsContract.getClaimableSleepRewards(tokenId);

            string memory okbRewardStr = SVGUtils.formatDecimal(totalOkbReward, 18, 4);
            string memory sleepRewardStr = SVGUtils.formatDecimal(sleepReward, 18, 2);

            renderedSvg = SVGUtils.replace(renderedSvg, "<!--OKB_REWARD-->", okbRewardStr);
            renderedSvg = SVGUtils.replace(renderedSvg, "<!--SLEEP_REWARD-->", sleepRewardStr);
        }

        string memory devUserStr = "0.00";
        string memory devTotalStr = "0.00";
        if (isDevSupported(tokenId) && devSupportContract != address(0)) {
            uint256 userAmount = getDevSupportAmount(tokenId);
            uint256 totalAmount = IDevSupport(devSupportContract).totalSupportReceived();
            devUserStr = SVGUtils.formatDecimal(userAmount, 18, 2);
            devTotalStr = SVGUtils.formatDecimal(totalAmount, 18, 2);
        }
        renderedSvg = SVGUtils.replace(renderedSvg, "<!--DEV_SUPPORT_USER-->", devUserStr);
        renderedSvg = SVGUtils.replace(renderedSvg, "<!--DEV_SUPPORT_TOTAL-->", devTotalStr);

        return renderedSvg;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "TokenAccessPass: URI query for nonexistent token");
        
        string memory finalSvg = _injectDynamicData(_tokenSVGs[tokenId], tokenId);

        uint256 okbReward = 0;
        uint256 sleepReward = 0;
        if (address(stakingRewardsContract) != address(0)) {
            (uint256 claimableOkb, uint256 pendingOkb) = stakingRewardsContract.getPendingRewards(tokenId);
            okbReward = claimableOkb + pendingOkb;
            (sleepReward,,) = stakingRewardsContract.getClaimableSleepRewards(tokenId);
        }
        
        uint256 userDevSupport = 0;
        if (isDevSupported(tokenId) && devSupportContract != address(0)) {
            userDevSupport = getDevSupportAmount(tokenId);
        }
        
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{',
            '"name": "Sleep Protocol Access Pass #', tokenId.toString(), '",',
            '"description": "A decentralized savings card for the Sleep Protocol ecosystem.",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(finalSvg)), '",',
            '"attributes": [',
                '{ "trait_type": "Claimable OKB", "value": "', SVGUtils.formatDecimal(okbReward, 18, 4), '"},',
                '{ "trait_type": "Claimable SLEEP", "value": "', SVGUtils.formatDecimal(sleepReward, 18, 2), '"},',
                '{ "trait_type": "Total Staked", "value": "', SVGUtils.formatDecimal(lockedAmounts[tokenId], 18, 2), '"},',
                '{ "trait_type": "Dev Support", "value": "', SVGUtils.formatDecimal(userDevSupport, 18, 2), '"}',
            ']',
            '}'
        ))));
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        if (address(stakingRewardsContract) != address(0) && from != address(0)) {
            stakingRewardsContract.updateStakerAddress(tokenId, from, to);
        }
    }
    
    function getNextTokenId() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}