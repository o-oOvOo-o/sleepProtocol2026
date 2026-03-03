# Sleep Protocol 前端和Subgraph更新计划

## 📊 **现状分析**

### **Subgraph 现状**
✅ **已实现的功能**:
- NFT Minting 追踪 (SleepNftPosition)
- NFT Marketplace 交易追踪
- 清算统计 (LiquidationStats)
- 奖励领取事件 (NftClaimEvent)

❌ **缺失的功能**:
- **池子系统追踪** - 完全缺失
- **Buy and Burn 统计** - 未实现
- **质押系统追踪** - 未实现
- **财库收入分配** - 未实现
- **税收阶段追踪** - 未实现

### **前端现状**
✅ **已实现的功能**:
- Win98风格界面完整
- 基础的Mint/Stake/Market功能
- 多语言支持 (EN/中文/한국어/日本語)
- 钱包连接集成

❌ **缺失的功能**:
- **Swap功能** - 只有Mock数据
- **池子流动性显示** - 未连接真实数据
- **Buy and Burn统计** - 完全缺失
- **税收阶段显示** - 使用硬编码数据
- **实时价格数据** - 未集成

## 🎯 **更新计划**

### **阶段1: Subgraph 扩展** 🔄

#### **1.1 新增池子系统Schema**
```graphql
# 池子实体
type PoolInfo @entity {
  id: ID! # pool address
  poolType: String! # "Protocol" or "Community"
  token0: Bytes!
  token1: Bytes!
  reserve0: BigInt!
  reserve1: BigInt!
  totalLiquidity: BigInt!
  isLocked: Boolean!
  createdAt: BigInt!
  lastUpdated: BigInt!
}

# 交易记录
type SwapTransaction @entity(immutable: true) {
  id: ID! # txHash-logIndex
  pool: PoolInfo!
  trader: Bytes!
  amount0In: BigInt!
  amount1In: BigInt!
  amount0Out: BigInt!
  amount1Out: BigInt!
  taxAmount: BigInt!
  taxStage: BigInt!
  isBuy: Boolean!
  timestamp: BigInt!
}

# 税收统计
type TaxStats @entity {
  id: ID! # Always "1" for singleton
  currentStage: BigInt!
  currentBuyTax: BigInt!
  currentSellTax: BigInt!
  totalTaxCollected: BigInt!
  daysInCurrentStage: BigInt!
  daysUntilNextStage: BigInt!
  lastUpdated: BigInt!
}

# Buy and Burn 统计
type BuyAndBurnStats @entity {
  id: ID! # Always "1" for singleton
  totalBurned: BigInt!
  totalOkbSpent: BigInt!
  burnCount: BigInt!
  lastBurnAmount: BigInt!
  lastBurnTimestamp: BigInt!
}
```

#### **1.2 新增事件处理器**
```typescript
// 池子事件处理
export function handleSwap(event: SwapEvent): void
export function handleLiquidityAdded(event: MintEvent): void
export function handleTaxCollected(event: TaxCollectedEvent): void

// Buy and Burn 事件处理
export function handleBuyAndBurnExecuted(event: BuyAndBurnExecutedEvent): void
export function handleTokensBurned(event: TokensBurnedEvent): void

// 财库事件处理
export function handleRevenueDistributed(event: RevenueDistributedEvent): void
export function handleAllocationExecuted(event: AllocationExecutedEvent): void
```

### **阶段2: 前端功能增强** 🎨

#### **2.1 新增Swap页面功能**
```typescript
// 真实的池子数据集成
interface PoolData {
  protocolPool: {
    reserve0: bigint;
    reserve1: bigint;
    currentPrice: number;
    totalLiquidity: bigint;
  };
  communityPool: {
    reserve0: bigint;
    reserve1: bigint;
    currentPrice: number;
    totalLiquidity: bigint;
  };
}

// 实时税收信息
interface TaxInfo {
  currentStage: number;
  buyTax: number;
  sellTax: number;
  daysInStage: number;
  daysUntilNext: number;
}
```

#### **2.2 新增Dashboard统计**
```typescript
// Buy and Burn 统计组件
const BuyAndBurnStats = () => {
  // 显示总销毁量、销毁次数、平均销毁规模等
};

// 池子流动性统计
const PoolLiquidityStats = () => {
  // 显示协议池和社区池的流动性分布
};

// 税收阶段进度条
const TaxStageProgress = () => {
  // 可视化当前税收阶段和进度
};
```

#### **2.3 增强Market页面**
```typescript
// 集成真实的池子交易功能
const SwapInterface = () => {
  // 连接到实际的池子合约
  // 显示实时滑点和税收计算
  // 支持协议池和社区池选择
};
```

### **阶段3: 数据集成和优化** 📡

#### **3.1 GraphQL查询优化**
```graphql
# 综合仪表板查询
query DashboardData($userAddress: Bytes!) {
  # 用户数据
  sleepNftPositions(where: { owner: $userAddress }) {
    id
    tokenId
    term
    maturityTs
    rank
    amplifier
    count
    isLiquidated
  }
  
  # 池子数据
  poolInfos {
    id
    poolType
    reserve0
    reserve1
    totalLiquidity
    lastUpdated
  }
  
  # 税收信息
  taxStats(id: "1") {
    currentStage
    currentBuyTax
    currentSellTax
    daysInCurrentStage
    daysUntilNextStage
  }
  
  # Buy and Burn 统计
  buyAndBurnStats(id: "1") {
    totalBurned
    totalOkbSpent
    burnCount
    lastBurnTimestamp
  }
}
```

#### **3.2 实时数据更新**
```typescript
// WebSocket 连接用于实时更新
const useRealtimePoolData = () => {
  // 监听池子状态变化
  // 更新价格和流动性数据
};

// 定期数据刷新
const usePeriodicDataRefresh = () => {
  // 每30秒刷新关键数据
  // 智能缓存策略
};
```

## 🛠️ **技术实现细节**

### **Subgraph 配置更新**
```yaml
# subgraph.yaml 新增数据源
dataSources:
  - kind: ethereum
    name: SleepV2Pool
    source:
      address: '${PROTOCOL_POOL_ADDRESS}'
      abi: SleepV2Pool
    mapping:
      eventHandlers:
        - event: Swap(address,uint256,uint256,uint256,uint256,address,uint256,uint256)
          handler: handleSwap
        - event: TaxCollected(address,uint256,uint256,bool)
          handler: handleTaxCollected

  - kind: ethereum
    name: BuyAndBurnEngine
    source:
      address: '${BUY_BURN_ENGINE_ADDRESS}'
      abi: BuyAndBurnEngine
    mapping:
      eventHandlers:
        - event: BuyAndBurnExecuted(uint256,uint256,uint256,address)
          handler: handleBuyAndBurnExecuted
        - event: TokensBurned(uint256,uint256,uint256,address,uint256)
          handler: handleTokensBurned
```

### **前端架构改进**
```typescript
// 新增Context用于池子数据
export const PoolContext = createContext<{
  poolData: PoolData;
  taxInfo: TaxInfo;
  buyAndBurnStats: BuyAndBurnStats;
  refreshData: () => void;
}>({});

// GraphQL客户端配置
const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      pollInterval: 30000, // 30秒轮询
    },
  },
});
```

## 📅 **实施时间表**

### **第1周: Subgraph扩展**
- [ ] 设计新的Schema结构
- [ ] 实现池子事件处理器
- [ ] 添加Buy and Burn追踪
- [ ] 部署和测试新版本

### **第2周: 前端数据集成**
- [ ] 更新GraphQL查询
- [ ] 实现新的Context和Hooks
- [ ] 集成实时池子数据
- [ ] 测试数据流

### **第3周: UI/UX增强**
- [ ] 完善Swap界面
- [ ] 添加Buy and Burn统计
- [ ] 实现税收阶段可视化
- [ ] 优化用户体验

### **第4周: 测试和部署**
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 部署到测试网
- [ ] 用户反馈收集

## 🎯 **成功指标**

### **功能完整性**
- ✅ 所有池子交易都被正确追踪
- ✅ Buy and Burn统计实时更新
- ✅ 税收阶段准确显示
- ✅ 前端数据与链上状态同步

### **用户体验**
- ✅ 页面加载时间 < 3秒
- ✅ 数据更新延迟 < 30秒
- ✅ 移动端适配良好
- ✅ 多语言支持完整

### **技术指标**
- ✅ Subgraph同步成功率 > 99%
- ✅ 前端错误率 < 1%
- ✅ API响应时间 < 500ms
- ✅ 代码覆盖率 > 80%

---

**总结**: 这个更新计划将使Sleep Protocol的前端和数据层与最新的池子系统完全同步，为用户提供完整、实时、准确的协议数据和交互体验。




