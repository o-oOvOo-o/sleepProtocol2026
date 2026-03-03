# 合约命名规范 (Contract Naming Convention)

## 📋 概述

为了确保项目的可扩展性和未来代币品牌的灵活性，我们采用通用的 `Token*` 命名规范，避免在合约文件名中硬编码特定的代币名称。

## 🔄 文件名映射表

### 核心协议合约

| 功能描述 | 旧文件名 | 新文件名 | 说明 |
|----------|----------|----------|------|
| 核心代币合约 | `SleepCoin.sol` | `TokenCore.sol` | 主要的 ERC20 代币合约 |
| 铸币机制合约 | `SleepMinter.sol` | `TokenMinter.sol` | 处理代币铸造和经济模型 |
| 储蓄卡NFT合约 | `SleepAccessPass.sol` | `TokenAccessPass.sol` | ERC-721 + ERC-6551 集成 |
| 质押奖励合约 | `StakingRewards.sol` | `TokenStaking.sol` | NFT-based 质押系统 |
| 资金分配合约 | `TreasuryDistributor.sol` | `TokenTreasury.sol` | 16天 Epoch 分配机制 |
| 专用税收池 | `SleepTaxPool.sol` | `TokenTaxPool.sol` | 项目专用的税收交易池 |
| NFT市场合约 | `NFTMarketplace.sol` | `TokenMarketplace.sol` | NFT 交易市场 |
| 开发者支持 | `DevSupport.sol` | `TokenDevSupport.sol` | Dev Support 权益系统 |
| 奖励计算器 | `RewardCalculator.sol` | `TokenRewardCalculator.sol` | 复杂奖励算法 |

### 行星泵生态合约

| 功能描述 | 文件名 | 说明 |
|----------|--------|------|
| 通用池工厂 | `PlanetPumpPoolFactory.sol` | 为其他项目创建税收池 |
| 统一路由器 | `PlanetPumpRouter.sol` | 多池子交易路由 |
| 税收配置管理 | `PlanetPumpTaxConfig.sol` | 项目方税率配置 |
| 通用池模板 | `PlanetPumpPoolTemplate.sol` | 可定制的池子模板 |
| 流动性管理 | `PlanetPumpLiquidityManager.sol` | 跨池流动性优化 |

### ERC-6551 相关合约

| 功能描述 | 文件名 | 说明 |
|----------|--------|------|
| 账户注册表 | `ERC6551Registry.sol` | 标准 ERC-6551 注册表 |
| 账户实现 | `ERC6551Account.sol` | NFT 绑定账户实现 |
| 账户工厂 | `ERC6551AccountFactory.sol` | 账户创建工厂 |

### 接口文件

| 功能描述 | 旧文件名 | 新文件名 | 说明 |
|----------|----------|----------|------|
| 质押代币接口 | `IStakingToken.sol` | `ITokenStaking.sol` | 质押相关接口 |
| 排名铸币接口 | `IRankedMintingToken.sol` | `ITokenMinter.sol` | 铸币相关接口 |
| 核心代币接口 | `ISleepCoin.sol` | `ITokenCore.sol` | 核心代币接口 |
| 储蓄卡接口 | `ISleepAccessPass.sol` | `ITokenAccessPass.sol` | NFT 相关接口 |
| 资金分配接口 | `ITreasuryDistributor.sol` | `ITokenTreasury.sol` | 资金分配接口 |

## 📁 目录结构

```
contracts/
├── core/                          # 核心协议合约
│   ├── TokenCore.sol
│   ├── TokenMinter.sol
│   ├── TokenAccessPass.sol
│   ├── TokenStaking.sol
│   └── TokenTreasury.sol
├── pools/                         # 池子相关合约
│   ├── TokenTaxPool.sol
│   ├── PlanetPumpPoolFactory.sol
│   ├── PlanetPumpRouter.sol
│   └── PlanetPumpTaxConfig.sol
├── nft/                          # NFT 相关合约
│   ├── TokenMarketplace.sol
│   ├── TokenDevSupport.sol
│   └── TokenRewardCalculator.sol
├── erc6551/                      # ERC-6551 相关合约
│   ├── ERC6551Registry.sol
│   ├── ERC6551Account.sol
│   └── ERC6551AccountFactory.sol
├── interfaces/                   # 接口文件
│   ├── ITokenCore.sol
│   ├── ITokenMinter.sol
│   ├── ITokenAccessPass.sol
│   ├── ITokenStaking.sol
│   └── ITokenTreasury.sol
├── libraries/                    # 工具库
│   ├── TokenMath.sol
│   ├── TokenSVG.sol
│   └── ABDKMath64x64.sol
└── utils/                        # 辅助合约
    ├── TokenMulticall.sol
    ├── TokenTimelock.sol
    └── TokenProxy.sol
```

## 🏷️ 合约内部命名规范

### 变量命名

```solidity
// ✅ 推荐：通用命名
contract TokenCore {
    string public constant TOKEN_NAME = "Sleep Coin";
    string public constant TOKEN_SYMBOL = "SLEEPING";
    
    mapping(address => bool) public isExcludedFromFee;
    address public tokenMinterContract;
    address public tokenTreasuryContract;
}

// ❌ 避免：硬编码特定名称
contract TokenCore {
    mapping(address => bool) public sleepExcluded;  // 避免
    address public sleepMinter;                     // 避免
}
```

### 事件命名

```solidity
// ✅ 推荐：通用事件名
event TokenMinted(address indexed to, uint256 amount);
event TaxCollected(uint256 amount, address indexed pool);
event StakingRewardDistributed(uint256 indexed tokenId, uint256 amount);

// ❌ 避免：特定代币名称
event SleepMinted(address indexed to, uint256 amount);  // 避免
```

### 函数命名

```solidity
// ✅ 推荐：通用函数名
function mintTokens(address to, uint256 amount) external;
function calculateReward(uint256 rank, uint256 term) public view returns (uint256);
function updateTaxRate(uint8 newRate) external onlyOwner;

// ❌ 避免：特定代币名称
function mintSleep(address to, uint256 amount) external;  // 避免
```

## 🔧 配置文件更新

### Hardhat 配置

```javascript
// hardhat.config.js
module.exports = {
  solidity: "0.8.19",
  networks: {
    xlayer: {
      url: "https://rpc.xlayer.tech",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### 部署脚本

```javascript
// scripts/deploy-core.js
async function main() {
  // 部署核心代币
  const TokenCore = await ethers.getContractFactory("TokenCore");
  const tokenCore = await TokenCore.deploy();
  
  // 部署铸币合约
  const TokenMinter = await ethers.getContractFactory("TokenMinter");
  const tokenMinter = await TokenMinter.deploy(tokenCore.address);
  
  console.log("TokenCore deployed to:", tokenCore.address);
  console.log("TokenMinter deployed to:", tokenMinter.address);
}
```

## 📝 文档更新规范

### README 更新

```markdown
# Token Protocol

## 合约地址

- **TokenCore**: `0x...` - 核心 ERC20 代币合约
- **TokenMinter**: `0x...` - 铸币和经济模型合约
- **TokenAccessPass**: `0x...` - 储蓄卡 NFT 合约
- **TokenTaxPool**: `0x...` - 专用税收交易池
```

### API 文档更新

```javascript
// 前端集成示例
import { TokenCore__factory, TokenMinter__factory } from './typechain';

const tokenCore = TokenCore__factory.connect(TOKEN_CORE_ADDRESS, signer);
const tokenMinter = TokenMinter__factory.connect(TOKEN_MINTER_ADDRESS, signer);
```

## 🚀 迁移计划

### 第一阶段：文件重命名

1. 创建新的合约文件（Token* 命名）
2. 复制现有合约代码到新文件
3. 更新内部变量和函数命名
4. 更新导入路径和接口引用

### 第二阶段：测试更新

1. 更新所有测试文件中的合约引用
2. 更新部署脚本
3. 更新前端接口文件
4. 验证所有功能正常

### 第三阶段：文档同步

1. 更新所有技术文档
2. 更新 API 文档
3. 更新部署指南
4. 通知开发团队新的命名规范

## ⚠️ 注意事项

1. **向后兼容**：在迁移期间保持旧文件，确保现有部署不受影响
2. **渐进迁移**：分批次更新，避免一次性大规模修改
3. **测试覆盖**：每个重命名的合约都需要完整的测试覆盖
4. **团队沟通**：确保所有开发人员了解新的命名规范

## 🎯 未来扩展

这个命名规范为未来的扩展预留了空间：

- **多代币支持**：可以轻松添加 `Token2Core.sol`、`Token3Core.sol` 等
- **品牌独立**：代币名称变更时只需修改常量，不需要重命名文件
- **模块化**：清晰的命名有助于代码模块化和重用
- **标准化**：符合 DeFi 行业的通用命名习惯

---

*本命名规范将随着项目发展持续更新和完善*
