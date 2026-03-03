# Sleep Protocol 双池子AMM系统

## 📋 概述

Sleep Protocol 实现了基于 Uniswap V2 和 V4 的定制化双池子AMM架构，完美解决了交易税征收与代币标准化的矛盾。

### 🏗️ 架构设计

```
Sleep Protocol AMM 系统
├── 池子A: 协议锁定池 (SleepV2Pool)
│   ├── 基于 Uniswap V2
│   ├── 永久锁定流动性
│   ├── 内置动态税收系统
│   └── 价格稳定器功能
├── 池子B: 社区流动性池 (V4 + Hook)
│   ├── 基于 Uniswap V4
│   ├── 开放社区参与
│   ├── V4 Hook 税收系统
│   └── LP 获得税收返还
└── 管理系统 (SleepPoolFactory)
    ├── 统一池子管理
    ├── 税收参数控制
    └── 紧急控制机制
```

## 🎯 核心特性

### ✅ 动态税收系统
- **4阶段递减税率**：18个月内从5%降至0%
- **池层税收**：保持代币ERC20纯净性
- **自动计算**：基于创世时间自动调整
- **灵活豁免**：支持地址级税收豁免

### ✅ 双池子架构
- **协议锁定池**：永久流动性，价格稳定
- **社区流动性池**：开放参与，高额激励
- **统一管理**：工厂合约统一控制

### ✅ 安全机制
- **重入保护**：所有关键函数防重入
- **权限控制**：多级权限管理
- **紧急控制**：暂停和恢复机制

## 📊 税率阶段

| 阶段 | 时间范围 | 买入税 | 卖出税 | 说明 |
|------|----------|--------|--------|------|
| 1 | 0-6个月 | 2% | 5% | 初期高税率 |
| 2 | 6-12个月 | 2% | 4% | 逐步降低 |
| 3 | 12-18个月 | 1% | 3% | 继续递减 |
| 4 | 18个月+ | 0% | 0% | 完全免税 |

## 🚀 部署指南

### 1. 部署顺序

```solidity
// 1. 部署核心代币 (如果未部署)
TokenCore sleepToken = new TokenCore();

// 2. 部署财库系统 (如果未部署)  
TokenTreasury treasury = new TokenTreasury(...);

// 3. 部署池子工厂
SleepPoolFactory factory = new SleepPoolFactory(
    address(sleepToken),
    OKB_TOKEN_ADDRESS,
    address(treasury)
);

// 4. 创建协议锁定池
address protocolPool = factory.createProtocolPool();

// 5. 添加初始流动性
factory.addProtocolLiquidity(sleepAmount, okbAmount);

// 6. 锁定流动性
factory.lockProtocolLiquidity();
```

### 2. V4社区池部署 (需要额外步骤)

```solidity
// V4 Hook 部署
SleepV4TaxHook hook = new SleepV4TaxHook(
    POOL_MANAGER_ADDRESS,
    address(sleepToken),
    OKB_TOKEN_ADDRESS,
    address(treasury)
);

// 设置社区池
factory.setCommunityPool(V4_POOL_ADDRESS, address(hook));

// 初始化系统
factory.initializePools();
```

## 💡 使用示例

### 交易示例

```solidity
// 获取池子地址
address poolAddress = factory.protocolOwnedPool();
SleepV2Pool pool = SleepV2Pool(poolAddress);

// 检查税率
(uint256 taxAmount, uint256 netAmount) = pool.calculateTax(
    1000 * 1e18,  // 交易金额
    true,         // 是否为买入
    msg.sender    // 交易者地址
);

// 执行交易
pool.swap(0, amountOut, msg.sender, "");
```

### 税率查询

```solidity
// 获取当前税率信息
ISleepPool.TaxInfo memory taxInfo = pool.getTaxInfo();

console.log("当前阶段:", taxInfo.stage);
console.log("买入税率:", taxInfo.currentBuyTax, "bp");
console.log("卖出税率:", taxInfo.currentSellTax, "bp");
console.log("距离下阶段:", taxInfo.daysUntilNext, "天");
```

### 管理操作

```solidity
// 设置税收豁免
factory.setTaxExemption(TREASURY_ADDRESS, true);
factory.setTaxExemption(STAKING_CONTRACT, true);

// 更新财库地址
factory.updateTreasury(NEW_TREASURY_ADDRESS);

// 紧急控制
factory.setTaxEnabled(false);  // 禁用税收
factory.emergencyPause();      // 紧急暂停
```

## 🔧 配置参数

### 税率配置

```solidity
// TaxCalculator.sol 中的参数
uint256 public constant STAGE1_BUY_TAX = 200;   // 2%
uint256 public constant STAGE1_SELL_TAX = 500;  // 5%
uint256 public constant STAGE2_BUY_TAX = 200;   // 2%
uint256 public constant STAGE2_SELL_TAX = 400;  // 4%
uint256 public constant STAGE3_BUY_TAX = 100;   // 1%
uint256 public constant STAGE3_SELL_TAX = 300;  // 3%
uint256 public constant STAGE4_BUY_TAX = 0;     // 0%
uint256 public constant STAGE4_SELL_TAX = 0;    // 0%
```

### 时间配置

```solidity
uint256 public constant DAYS_IN_6_MONTHS = 182;
uint256 public constant DAYS_IN_12_MONTHS = 365;
uint256 public constant DAYS_IN_18_MONTHS = 547;
```

## 🛡️ 安全考虑

### 权限管理
- **工厂所有者**：可以创建池子、设置参数
- **池子初始化**：只能初始化一次
- **流动性锁定**：不可逆操作

### 重入保护
- 所有外部调用都有重入保护
- 使用 OpenZeppelin 的 ReentrancyGuard

### 紧急机制
- 紧急暂停功能
- 税收系统开关
- 参数更新权限

## 📈 监控和分析

### 关键指标

```solidity
// 池子统计
function getPoolStatistics(address pool) external view returns (
    uint256 reserve0,      // SLEEP 储备
    uint256 reserve1,      // OKB 储备  
    uint256 totalLiquidity,// 总流动性
    uint256 currentPrice   // 当前价格
);

// 税收统计
function getTaxInfo() external view returns (
    uint256 currentBuyTax,   // 当前买入税
    uint256 currentSellTax,  // 当前卖出税
    uint256 stage,           // 当前阶段
    uint256 daysInStage,     // 阶段内天数
    uint256 daysUntilNext    // 距下阶段天数
);
```

### 事件监听

```solidity
// 交易事件
event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In, 
    uint amount0Out,
    uint amount1Out,
    address indexed to,
    uint256 taxAmount,
    uint256 stage
);

// 税收事件
event TaxCollected(
    address indexed from,
    uint256 amount,
    uint256 stage,
    bool isBuy
);
```

## 🔮 未来扩展

### V4 Hook 功能
- 动态费率调整
- LP 奖励分配
- 高级交易策略

### 跨链支持
- 多链部署
- 跨链流动性
- 统一税收管理

### 治理集成
- DAO 参数控制
- 社区投票
- 自动化治理

## 📞 技术支持

如有问题或建议，请联系开发团队或提交 GitHub Issue。

---

**⚠️ 重要提醒**：
1. 在主网部署前请进行充分测试
2. 确保所有参数配置正确
3. 建议进行专业安全审计
4. 保管好管理员私钥安全




