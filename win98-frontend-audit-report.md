# Win98 前端数据连接审查报告

## 🔍 审查概述

经过详细审查 Win98 Sleep Protocol 前端，发现了多个需要修复的问题，主要涉及假数据、缺失的合约集成和过时的接口调用。

## ❌ 发现的问题

### 1. **假数据和硬编码值**

#### Dashboard.tsx (第107-196行)
```typescript
// 🚨 问题：所有 AMM 系统数据都是假数据
<StatValue>5,000,000 SLEEPING + 5,000 OKB</StatValue>  // 硬编码
<StatValue>1,000,000 SLEEPING + 1,000 OKB</StatValue>  // 硬编码
<StatValue>1 SLEEPING = 0.000001 OKB</StatValue>       // 硬编码
<StatValue>阶段 1/4 (买入: 2%, 卖出: 5%)</StatValue>    // 硬编码

// 🚨 问题：Buy & Burn 统计全部假数据
<StatValue style={{ color: '#ff6b6b' }}>2,500,000 SLEEPING</StatValue>  // 硬编码
<StatValue>45 次</StatValue>                                              // 硬编码
<StatValue>2,500 OKB</StatValue>                                         // 硬编码

// 🚨 问题：税收阶段进度是模拟的
width: '55%', // 假设进度55%
<div style={{ color: '#26A17B', fontWeight: 'bold', fontSize: '16px' }}>82 天</div>  // 硬编码
```

#### Dashboard.tsx (第62-68行)
```typescript
// 🚨 问题：userMintData 在 SleepContext 中不存在
<StatValue>{userMintData?.totalMints || 0}</StatValue>      // userMintData 未定义
<StatValue>{userMintData?.activeMints || 0}</StatValue>     // userMintData 未定义
```

### 2. **缺失的合约集成**

#### SleepContext.tsx
```typescript
// 🚨 问题：缺少 userMintData 的获取逻辑
const { 
  sleepBalance, 
  userMintData,  // ❌ 这个变量在 SleepContext 中不存在
  userStakeData,
  globalRank,
  genesisTs
} = useSleepContext();
```

#### Mint.tsx (第62-69行)
```typescript
// 🚨 问题：所有铸币操作都是 Mock
if (onMintSubmit) {
  await onMintSubmit(Number(count), Number(term));
} else {
  // Mock - 没有实际合约调用
  await new Promise(resolve => setTimeout(resolve, 2000));
  toast.success('铸造功能即将上线！');
}
```

#### Stake.tsx (第43-49行)
```typescript
// 🚨 问题：所有质押操作都是 Mock
if (onATMStake) {
  await onATMStake(atmAmount);
} else {
  // Mock implementation - 没有实际合约调用
  await new Promise(resolve => setTimeout(resolve, 2000));
  toast.success('质押功能即将上线！');
}
```

### 3. **过时的合约接口**

#### SleepContext.tsx (第13行)
```typescript
// 🚨 问题：仍在使用旧的合约名称
import { sleepCoinContract, sleepMinterContract, stakingRewardsContract } from "~/lib/contracts";
// 应该使用：tokenCoreContract, tokenMinterContract, tokenStakingContract
```

#### SleepContext.tsx (第113-114行)
```typescript
// 🚨 问题：调用的函数可能在新合约中不存在或已更改
{ ...sleepMinterContract(chain), functionName: "globalRank" },
{ ...sleepMinterContract(chain), functionName: "genesisTs" },
```

## ✅ 修复计划

### 阶段 1: 更新 SleepContext 合约集成

1. **更新合约导入**
```typescript
// 替换旧的导入
import { tokenCoreContract, tokenMinterContract, tokenStakingContract } from "~/lib/contracts";
```

2. **添加 userMintData 获取逻辑**
```typescript
// 添加用户铸币数据获取
const { data: userMintData, refetch: refetchMintData } = useReadContracts({
  contracts: [
    {
      ...tokenMinterContract(chain),
      functionName: 'balanceOf',
      args: [address as Address],
    },
    // 其他铸币相关查询
  ],
  query: {
    enabled: !!address,
    cacheTime: 0,
  },
});
```

3. **验证合约函数名称**
   - 检查 `globalRank` 函数是否存在于 TokenMinter 合约
   - 检查 `genesisTs` 函数是否存在
   - 更新所有函数调用以匹配新合约 ABI

### 阶段 2: 实现真实的合约交互

1. **实现真实的铸币功能**
```typescript
// 在 Mint.tsx 中添加真实的合约调用
const handleMintSubmit = async (count: number, term: number) => {
  const { request } = await simulateContract({
    ...tokenMinterContract(),
    functionName: 'mint',
    args: [BigInt(count), BigInt(term)],
  });
  
  const hash = await writeContract(request);
  await waitForTransaction({ hash });
};
```

2. **实现真实的质押功能**
```typescript
// 在 Stake.tsx 中添加真实的合约调用
const handleStakeSubmit = async (amount: string) => {
  // 先批准代币
  const approveHash = await writeContract({
    ...tokenCoreContract(),
    functionName: 'approve',
    args: [tokenStakingContract().address, parseEther(amount)],
  });
  
  await waitForTransaction({ hash: approveHash });
  
  // 然后质押
  const stakeHash = await writeContract({
    ...tokenStakingContract(),
    functionName: 'stake',
    args: [parseEther(amount)],
  });
  
  await waitForTransaction({ hash: stakeHash });
};
```

### 阶段 3: 替换假数据为真实数据

1. **获取真实的协议统计数据**
```typescript
// 添加协议级别的数据获取
const { data: protocolStats } = useReadContracts({
  contracts: [
    { ...tokenTreasuryContract(chain), functionName: 'getTotalRevenue' },
    { ...tokenTreasuryContract(chain), functionName: 'getCurrentEpoch' },
    // 其他协议统计
  ],
});
```

2. **获取真实的市场数据**
```typescript
// 添加市场数据获取
const { data: marketData } = useReadContracts({
  contracts: [
    { ...minterMarketplaceContract(chain), functionName: 'getActiveListings' },
    { ...accessPassMarketplaceContract(chain), functionName: 'getFloorPrice' },
    // 其他市场统计
  ],
});
```

### 阶段 4: 添加缺失的功能

1. **AccessPass 功能**
   - 实现 AccessPass NFT 的铸造
   - 显示用户的 AccessPass 等级和权益
   - 集成 AccessPass 市场功能

2. **市场功能**
   - 实现 NFT 上架/下架
   - 实现 NFT 购买
   - 显示真实的市场统计

3. **清算功能**
   - 实现过期铸币的识别
   - 实现清算操作
   - 显示清算奖励

## 🎯 优先级

### 高优先级 (立即修复)
1. 更新 SleepContext 中的合约导入和函数调用
2. 添加 userMintData 的获取逻辑
3. 验证所有合约函数名称和参数

### 中优先级 (本周完成)
1. 实现真实的铸币和质押功能
2. 替换 Dashboard 中的假数据
3. 添加错误处理和加载状态

### 低优先级 (后续优化)
1. 实现完整的市场功能
2. 添加高级功能 (清算、AccessPass 等)
3. 优化用户体验和动画效果

## 📁 需要修改的文件

1. `xenfyi-testnet/src/contexts/SleepContext.tsx` - 更新合约集成
2. `xenfyi-testnet/src/win98/components/applications/SleepProtocol/Dashboard.tsx` - 替换假数据
3. `xenfyi-testnet/src/win98/components/applications/SleepProtocol/Mint.tsx` - 实现真实铸币
4. `xenfyi-testnet/src/win98/components/applications/SleepProtocol/Stake.tsx` - 实现真实质押
5. `xenfyi-testnet/src/win98/components/applications/SleepProtocol/Market.tsx` - 实现市场功能
6. `xenfyi-testnet/src/win98/components/applications/SleepProtocol/AccessPass.tsx` - 实现 AccessPass 功能

## 🔧 下一步行动

1. 立即开始修复 SleepContext 中的合约集成问题
2. 逐个组件替换假数据为真实合约数据
3. 添加完整的错误处理和用户反馈
4. 进行全面测试以确保所有功能正常工作

