# 一键部署脚本更新总结

## 🎯 更新目的

为了支持新的 **MarketTreasury** 合约，一键部署脚本需要：
1. 识别并处理 `MarketTreasury` 合约
2. 更新前端的地址配置
3. 复制 ABI 文件到前端和 Subgraph

---

## 📝 更新内容

### 1. scripts/update-configs.ts

#### contractNameMapping 添加

**位置**: 第 250-264 行

**更新前**:
```typescript
const contractNameMapping: { [key: string]: string } = {
    'TokenCore': 'tokenCoreAddress',
    'TokenMinter': 'tokenMinterAddress', 
    'TokenStaking': 'tokenStakingAddress',
    'TokenTreasury': 'tokenTreasuryAddress',
    'TokenAccessPass': 'tokenAccessPassAddress',
    'SleepNftMarketplace': 'sleepNftMarketplaceAddress',
    'DevSupport': 'devSupportAddress',
    // ...
};
```

**更新后**:
```typescript
const contractNameMapping: { [key: string]: string } = {
    'TokenCore': 'tokenCoreAddress',
    'TokenMinter': 'tokenMinterAddress', 
    'TokenStaking': 'tokenStakingAddress',
    'TokenTreasury': 'tokenTreasuryAddress',
    'TokenAccessPass': 'tokenAccessPassAddress',
    'SleepNftMarketplace': 'sleepNftMarketplaceAddress',
    'MarketTreasury': 'marketTreasuryAddress', // ← 新增
    'DevSupport': 'devSupportAddress',
    // ...
};
```

---

### 2. xenfyi-testnet/src/lib/contracts.ts

#### A. 导入 ABI

**位置**: 第 1-8 行

```typescript
import { abi as tokenCoreABI } from '~/abi/TokenCore';
import { abi as tokenMinterABI } from '~/abi/TokenMinter';
import { abi as tokenStakingABI } from '~/abi/TokenStaking';
import { abi as tokenAccessPassABI } from '~/abi/TokenAccessPass';
import { abi as tokenTreasuryABI } from '~/abi/TokenTreasury';
import { abi as sleepNftMarketplaceABI } from '~/abi/SleepNftMarketplace';
import { abi as marketTreasuryABI } from '~/abi/MarketTreasury'; // ← 新增
```

#### B. 添加地址常量

**位置**: 第 33-37 行

```typescript
// Unified NFT Marketplace (replaces MinterMarketplace and AccessPassMarketplace)
const sleepNftMarketplaceAddress = '0x51fa84a95671447516d1aF943C2e1aEb03cD6C12' as const;

// Market Treasury - stores marketplace fees
const marketTreasuryAddress = '0x0000000000000000000000000000000000000000' as const; // ← 新增
```

#### C. 添加合约导出函数

**位置**: 第 87-92 行

```typescript
// Market Treasury - stores marketplace fees
export const marketTreasuryContract = (chain: Chain = xLayerTestnet) => ({
    address: marketTreasuryAddress,
    abi: marketTreasuryABI as Abi,
    chain: chain
});
```

---

## 🔄 一键部署流程

### 完整流程

```bash
npx ts-node scripts/update-configs.ts
```

#### 选项说明

```
1. 📋 Contracts and frontend only  # 合约 + 前端
2. 🎨 Frontend only                # 仅前端
3. 📊 Subgraph only                # 仅 Subgraph
4. 🔄 Full redeployment            # 完整重新部署
5. ❌ Exit                          # 退出
```

### 自动化步骤

#### Step 1: 读取部署信息
```
读取 deployment-info.json
├─ TokenCore
├─ TokenMinter
├─ TokenStaking
├─ TokenTreasury
├─ TokenAccessPass
├─ SleepNftMarketplace
├─ MarketTreasury          ← 新增
└─ DevSupport
```

#### Step 2: 复制 ABI 文件
```
从 artifacts/contracts/ 复制到:
├─ xenfyi-testnet/src/abi/
│  ├─ TokenCore.ts
│  ├─ TokenMinter.ts
│  ├─ ...
│  └─ MarketTreasury.ts    ← 新增
└─ subgraph/abis/
   ├─ TokenCore.json
   ├─ TokenMinter.json
   ├─ ...
   └─ MarketTreasury.json  ← 新增
```

#### Step 3: 更新前端地址
```
更新 xenfyi-testnet/src/lib/contracts.ts:
├─ tokenCoreAddress = '0x...'
├─ tokenMinterAddress = '0x...'
├─ ...
└─ marketTreasuryAddress = '0x...'  ← 新增
```

#### Step 4: 更新 Subgraph 配置
```
更新 subgraph/subgraph.yaml:
- 更新合约地址
- 更新 startBlock
```

#### Step 5: 重新部署 Subgraph
```
cd subgraph
npx graph codegen
npx graph build
npx graph create --node http://127.0.0.1:8020/ sleep-protocol
npx graph deploy --version-label v{timestamp} sleep-protocol
```

---

## 📊 deployment-info.json 格式

### 期望格式

```json
{
  "TokenCore": {
    "address": "0xBF12e82372fDdc909719fA3B27E66142316bE057",
    "blockNumber": 11598422
  },
  "MarketTreasury": {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "blockNumber": 11598480
  },
  "SleepNftMarketplace": {
    "address": "0x51fa84a95671447516d1aF943C2e1aEb03cD6C12",
    "blockNumber": 11598483
  }
}
```

### 关键字段

- **address**: 合约部署地址（必需）
- **blockNumber**: 部署区块号（必需，用于 Subgraph startBlock）

---

## 🧪 测试验证

### 1. 验证 ABI 文件

```bash
# 检查前端 ABI
ls xenfyi-testnet/src/abi/MarketTreasury.ts

# 检查 Subgraph ABI
ls subgraph/abis/MarketTreasury.json
```

### 2. 验证前端地址更新

```bash
# 检查 contracts.ts
grep "marketTreasuryAddress" xenfyi-testnet/src/lib/contracts.ts
```

### 3. 验证前端可以导入

```typescript
import { marketTreasuryContract } from '~/lib/contracts';

// 应该能正常使用
const treasury = marketTreasuryContract();
console.log(treasury.address); // 应该输出正确的地址
```

---

## 🔍 调试指南

### 问题 1: ABI 文件未生成

**症状**: `Cannot find module '~/abi/MarketTreasury'`

**解决**:
```bash
# 检查合约是否编译
npx hardhat compile

# 检查 artifacts 目录
ls artifacts/contracts/MarketTreasury.sol/

# 手动运行 ABI 复制
npx ts-node scripts/update-configs.ts
# 选择 2 (Frontend only)
```

### 问题 2: 地址未更新

**症状**: `marketTreasuryAddress` 仍然是 `0x0000...0000`

**解决**:
```bash
# 检查 deployment-info.json
cat deployment-info.json | grep MarketTreasury

# 如果没有 MarketTreasury，重新部署合约
npx hardhat run scripts/deploy.cjs --network xlayertest

# 然后运行配置更新
npx ts-node scripts/update-configs.ts
```

### 问题 3: Subgraph 未包含 MarketTreasury

**说明**: 
MarketTreasury 是一个独立的金库合约，**不需要** 在 Subgraph 中索引。

Subgraph 只需要索引：
- ✅ SleepNftMarketplace (市场合约)
- ❌ MarketTreasury (金库合约) - 不需要索引

---

## 📋 Checklist

### 部署前
- ✅ 合约已编译 (`npx hardhat compile`)
- ✅ 合约已部署 (`npx hardhat run scripts/deploy.cjs`)
- ✅ `deployment-info.json` 包含 `MarketTreasury`

### 运行一键脚本后
- ✅ `xenfyi-testnet/src/abi/MarketTreasury.ts` 存在
- ✅ `xenfyi-testnet/src/lib/contracts.ts` 中 `marketTreasuryAddress` 已更新
- ✅ `xenfyi-testnet/src/lib/contracts.ts` 中 `marketTreasuryContract` 函数存在
- ✅ 前端编译无错误 (`npm run build`)

### 功能测试
- ✅ 前端可以导入 `marketTreasuryContract`
- ✅ 可以读取金库余额
- ✅ 市场合约的 `getMarketStats()` 返回正确的 treasury 地址

---

## 🎯 完整部署示例

### 1. 编译合约
```bash
npx hardhat compile
```

### 2. 部署合约
```bash
npx hardhat run scripts/deploy.cjs --network xlayertest
```

**预期输出**:
```
Step 6: Deploying MarketTreasury...
✅ MarketTreasury deployed to: 0x1234...5678

Step 7: Deploying Unified SleepNftMarketplace...
✅ SleepNftMarketplace deployed to: 0xabcd...ef01

Step 7.2: Setting Treasury address in SleepNftMarketplace...
- ✅ Treasury set to: 0x1234...5678
```

### 3. 运行一键配置
```bash
npx ts-node scripts/update-configs.ts
```

**选择**: `1` (Contracts and frontend only)

**预期输出**:
```
🚀 Step 2: Copying ABIs to frontend and subgraph...
   - ✅ Updated MarketTreasury ABI

🚀 Step 3: Intelligently updating frontend contract addresses...
   - ✅ Updated marketTreasuryAddress to 0x1234...5678

🎉 Configuration update complete!
```

### 4. 重启前端
```bash
cd xenfyi-testnet
npm run dev
```

### 5. 测试
- 打开浏览器访问 NFT Market
- 切换到"市场金库"标签
- 验证金库地址显示正确

---

## 🎉 总结

### 更新内容
- ✅ `update-configs.ts` 添加 MarketTreasury 映射
- ✅ `contracts.ts` 添加 MarketTreasury ABI 导入
- ✅ `contracts.ts` 添加 marketTreasuryAddress 常量
- ✅ `contracts.ts` 添加 marketTreasuryContract 导出函数

### 自动化流程
- ✅ ABI 文件自动复制
- ✅ 地址自动更新
- ✅ 无需手动修改配置

### 兼容性
- ✅ 向后兼容旧合约
- ✅ 支持增量更新
- ✅ 支持完整重新部署

**一键部署脚本已准备就绪！** 🚀








