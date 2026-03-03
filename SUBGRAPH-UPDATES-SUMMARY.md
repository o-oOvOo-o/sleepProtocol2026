# Subgraph 更新总结

## 🎯 更新内容

为了支持新的市场金库和统计功能，Subgraph 需要以下更新：

---

## 📝 Schema 更新

### MarketStats 实体

**文件**: `subgraph/schema.graphql`

#### 添加字段
```graphql
type MarketStats @entity {
  # ... 原有字段 ...
  
  # 交易统计
  totalVolume: BigInt!       # 总交易量 (OKB) ← 注释更新
  totalSales: BigInt!        # 总交易笔数 ← 已有
  totalFees: BigInt!         # 总手续费收入 (OKB) ← 注释更新
  
  # 市场配置
  currentFeePercent: BigInt! # 当前手续费率 (基点)
  treasury: Bytes            # 金库合约地址 ← 新增
  
  # ... 其他字段 ...
}
```

#### 变更说明
- ✅ **新增** `treasury: Bytes` - 记录金库合约地址
- ✅ **更新注释** - 明确 `totalVolume` 和 `totalFees` 单位为 OKB（之前注释写的是 SLEEPING）

---

## 🔧 Mapping 更新

### 1. 导入新事件

**文件**: `subgraph/src/nft-marketplace.ts`

```typescript
import {
  NFTListed as NFTListedEvent,
  NFTSold as NFTSoldEvent,
  NFTDelisted as NFTDelistedEvent,
  MarketplaceFeeUpdated as MarketplaceFeeUpdatedEvent,
  TreasuryUpdated as TreasuryUpdatedEvent  // ← 新增
} from "../generated/SleepNftMarketplace/SleepNftMarketplace";
```

### 2. 添加 TreasuryUpdated 事件处理器

**文件**: `subgraph/src/nft-marketplace.ts`

```typescript
export function handleTreasuryUpdated(event: TreasuryUpdatedEvent): void {
  log.info("=== TreasuryUpdated Event Received ===", []);
  log.info("Old Treasury: {}, New Treasury: {}", [
    event.params.oldTreasury.toHex(),
    event.params.newTreasury.toHex()
  ]);

  // Update market stats with new treasury address
  let stats = getOrCreateMarketStats();
  stats.treasury = event.params.newTreasury;
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  
  log.info("✅ MarketStats treasury updated to: {}", [event.params.newTreasury.toHex()]);
  log.info("=== TreasuryUpdated Event Handler Completed Successfully ===", []);
}
```

### 3. 确认现有统计逻辑

**已存在且正确** - 无需修改：

```typescript
// handleNFTSold 函数中 (第 210-213 行)
stats.activeListings = stats.activeListings.minus(BigInt.fromI32(1));
stats.totalVolume = stats.totalVolume.plus(event.params.price);      // ✅ 累加交易额
stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1));         // ✅ 累加交易笔数
stats.totalFees = stats.totalFees.plus(event.params.fee);            // ✅ 累加手续费
```

---

## 📋 subgraph.yaml 更新

### 添加事件监听

**文件**: `subgraph/subgraph.yaml`

```yaml
  - kind: ethereum
    name: SleepNftMarketplace
    # ... 其他配置 ...
    mapping:
      # ... 其他配置 ...
      eventHandlers:
        - event: NFTListed(indexed address,indexed uint256,indexed address,uint256)
          handler: handleNFTListed
        - event: NFTSold(indexed address,indexed uint256,indexed address,address,uint256,uint256)
          handler: handleNFTSold
        - event: NFTDelisted(indexed address,indexed uint256,indexed address)
          handler: handleNFTDelisted
        - event: MarketplaceFeeUpdated(uint256,uint256)
          handler: handleMarketplaceFeeUpdated
        - event: TreasuryUpdated(indexed address,indexed address)  # ← 新增
          handler: handleTreasuryUpdated                           # ← 新增
      file: ./src/nft-marketplace.ts
```

---

## 🔄 数据流程

### 交易发生时

```
用户购买 NFT
    ↓
合约触发 NFTSold 事件
    ↓
Subgraph 捕获事件
    ↓
handleNFTSold() 执行:
    ├─ 更新 MarketListing (active = false)
    ├─ 创建 MarketSale 记录
    ├─ 更新 NFT owner
    └─ 更新 MarketStats:
        ├─ totalVolume += price      (总交易额)
        ├─ totalSales += 1           (总笔数)
        ├─ totalFees += fee          (总手续费)
        └─ activeListings -= 1
    ↓
数据同步到 GraphQL 数据库
    ↓
前端查询 MarketStats 获取统计数据
```

### 金库地址更新时

```
Owner 调用 setTreasury()
    ↓
合约触发 TreasuryUpdated 事件
    ↓
Subgraph 捕获事件
    ↓
handleTreasuryUpdated() 执行:
    └─ 更新 MarketStats.treasury
    ↓
数据同步到 GraphQL 数据库
    ↓
前端查询显示新的金库地址
```

---

## 📊 前端可查询的数据

### GraphQL 查询示例

```graphql
query GetMarketStats {
  marketStats(id: "1") {
    # 交易统计
    totalVolume      # 总交易量 (WEI)
    totalSales       # 总交易笔数
    totalFees        # 总手续费 (WEI)
    
    # 挂单统计
    activeListings   # 当前活跃挂单
    totalListings    # 历史总挂单
    
    # 配置
    currentFeePercent  # 当前手续费率 (基点)
    treasury           # 金库合约地址
    
    # 其他
    lastUpdated      # 最后更新时间
  }
}
```

### 前端使用示例

```typescript
const { data: marketData } = useMarketData();

// Subgraph 提供的数据
const totalVolume = marketData.marketStats?.totalVolume || 0;
const totalSales = marketData.marketStats?.totalSales || 0;
const totalFees = marketData.marketStats?.totalFees || 0;
const treasury = marketData.marketStats?.treasury;
```

---

## ✅ 数据完整性

### Subgraph 统计 vs 合约统计

| 数据项 | Subgraph | 合约 | 数据源 |
|--------|----------|------|--------|
| **totalVolume** | ✅ | ✅ | 两者应该一致 |
| **totalSales** | ✅ | ✅ | 两者应该一致 |
| **totalFees** | ✅ | ✅ | 两者应该一致 |
| **treasury** | ✅ | ✅ | 从合约同步 |
| **activeListings** | ✅ | ❌ | 仅 Subgraph |

### 推荐使用策略

**方案 1: 混合使用** (当前实现)
- ✅ 关键统计数据（totalVolume, totalSales, totalFees）- 从**合约**直接读取
- ✅ 列表数据（listings, sales）- 从 **Subgraph** 查询
- **优势**: 统计数据最准确，列表数据方便查询

**方案 2: 纯 Subgraph** (备选)
- 所有数据都从 Subgraph 查询
- **优势**: 前端代码简单，减少合约调用
- **劣势**: 依赖 Subgraph 同步延迟

---

## 🚀 部署步骤

### 1. 重新生成类型
```bash
cd subgraph
npx graph codegen
```

### 2. 重新构建
```bash
npx graph build
```

### 3. 部署（通过一键脚本）
```bash
cd ..
npx ts-node scripts/update-configs.ts
# 选择 4 (Subgraph only)
```

---

## 🧪 测试验证

### 1. 验证 schema 字段
```bash
# 部署后查询
query {
  marketStats(id: "1") {
    treasury  # 应该有值或 null
  }
}
```

### 2. 测试 TreasuryUpdated 事件
```bash
# 1. 部署合约和金库
# 2. 调用 setTreasury
# 3. 查询 Subgraph
# 4. 验证 treasury 字段已更新
```

### 3. 验证统计准确性
```bash
# 1. 完成一笔交易
# 2. 查询 Subgraph: marketStats { totalSales, totalVolume, totalFees }
# 3. 查询合约: getMarketStats()
# 4. 对比两者数据是否一致
```

---

## 📋 Checklist

- ✅ **Schema 更新**: 添加 `treasury` 字段
- ✅ **Mapping 更新**: 添加 `handleTreasuryUpdated` 函数
- ✅ **subgraph.yaml 更新**: 添加 `TreasuryUpdated` 事件监听
- ✅ **确认统计逻辑**: `totalVolume`, `totalSales`, `totalFees` 正确累加
- ⏳ **部署测试**: 需要运行一键脚本重新部署
- ⏳ **功能验证**: 需要测试交易后数据是否正确

---

## 🎯 总结

### Subgraph 已有的功能 ✅
- ✅ 记录每笔交易的 `totalVolume`（总交易额）
- ✅ 记录每笔交易的 `totalSales`（总笔数）
- ✅ 记录每笔交易的 `totalFees`（总手续费）
- ✅ 记录每笔交易的详细信息（MarketSale）

### 新增的功能 ✅
- ✅ 记录金库合约地址（`treasury`）
- ✅ 监听金库地址更新事件（`TreasuryUpdated`）

### 前端优化 ✅
- ✅ 从合约直接读取统计数据（更准确）
- ✅ 从 Subgraph 查询列表和历史（更方便）
- ✅ 显示金库地址和说明

**所有 Subgraph 更新已完成！准备重新部署！** 🎉








