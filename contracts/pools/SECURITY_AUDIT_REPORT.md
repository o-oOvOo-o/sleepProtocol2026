# Sleep Protocol 池子系统安全审计报告

## 🔍 **审计概述**

**审计范围**: Sleep Protocol 双池子AMM系统
**审计日期**: 2025年10月2日
**审计合约**:
- `TaxCalculator.sol` - 税收计算库
- `SleepV2Pool.sol` - V2协议锁定池
- `SleepV4TaxHook.sol` - V4税收Hook
- `SleepPoolFactory.sol` - 池子工厂合约

## 🚨 **发现的安全问题**

### **🔴 高危问题**

#### **1. SleepV2Pool.sol - 税收征收时机错误**
**位置**: `swap()` 函数 L256-258
```solidity
// 问题代码
if (taxAmount > 0) {
    address taxToken = isBuy ? token1 : token0;
    _safeTransfer(taxToken, treasury, taxAmount); // ❌ 在K值验证前转移税收
    
    emit TaxCollected(msg.sender, taxAmount, stage, isBuy);
}
```

**风险**: 
- 税收在K值验证前就被转移，可能导致K值验证失败
- 攻击者可能利用这个时机差进行套利攻击

**修复建议**:
```solidity
// 修复方案：先验证K值，再征收税收
// 1. 计算税收但不立即转移
// 2. 验证K值（考虑税收影响）
// 3. 最后转移税收
```

#### **2. SleepV2Pool.sol - burn函数流动性计算错误**
**位置**: `burn()` 函数 L194-202
```solidity
// 问题代码
function burn(address to) external override lock nonReentrant returns (uint amount0, uint amount1) {
    require(!liquidityLocked, "SleepV2Pool: LIQUIDITY_LOCKED");
    
    // ❌ 没有正确获取要销毁的流动性数量
    uint liquidity = totalLiquidity; // 这里应该是用户要销毁的数量，不是总数量
    
    amount0 = (liquidity * balance0) / totalLiquidity; // ❌ 会导致全部流动性被销毁
    amount1 = (liquidity * balance1) / totalLiquidity;
}
```

**风险**: 
- 任何人调用burn都会销毁所有流动性
- 严重的资金安全问题

**修复建议**:
```solidity
// 需要重新设计burn机制，或者完全禁用（因为是协议锁定池）
function burn(address to) external override {
    revert("SleepV2Pool: Burn not allowed for protocol-owned pool");
}
```

#### **3. SleepPoolFactory.sol - 初始化权限问题**
**位置**: `initialize()` 函数 L87
```solidity
// 问题代码
function initialize(...) external {
    require(token0 == address(0), "SleepV2Pool: Already initialized");
    // ❌ 没有权限控制，任何人都可以调用初始化
}
```

**风险**: 
- 攻击者可能抢先初始化池子
- 可能设置恶意的treasury地址

**修复建议**:
```solidity
// 添加权限控制
function initialize(...) external {
    require(msg.sender == factory, "SleepV2Pool: Only factory can initialize");
    require(token0 == address(0), "SleepV2Pool: Already initialized");
    // ...
}
```

### **🟡 中危问题**

#### **4. TaxCalculator.sol - 时间戳依赖**
**位置**: `getCurrentTaxRates()` 函数 L62
```solidity
// 潜在问题
uint256 daysSinceGenesis = (block.timestamp - genesisTimestamp) / SECONDS_IN_DAY;
```

**风险**: 
- 依赖block.timestamp，矿工可以在一定范围内操纵
- 可能导致税率阶段的边界攻击

**修复建议**:
```solidity
// 添加时间戳验证和缓冲机制
require(block.timestamp >= genesisTimestamp, "TaxCalculator: Invalid timestamp");
// 考虑添加小的缓冲期来避免边界攻击
```

#### **5. SleepV2Pool.sol - K值验证不够严格**
**位置**: `swap()` 函数 L271-276
```solidity
// 问题代码
uint balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
uint balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
require(
    balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * 1000**2,
    'SleepV2Pool: K'
);
```

**风险**: 
- 没有考虑税收对K值的影响
- 可能允许不公平的交易

**修复建议**:
```solidity
// 在K值验证中考虑税收影响
uint balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
uint balance1Adjusted = (balance1 * 1000) - (amount1In * 3);

// 如果征收了税收，需要调整K值验证
if (taxAmount > 0) {
    // 调整逻辑以考虑税收影响
}
```

#### **6. SleepV4TaxHook.sol - Hook权限验证不足**
**位置**: 各个Hook函数
```solidity
// 问题代码
function beforeSwap(...) external returns (bytes4, int256) {
    require(msg.sender == poolManager, "SleepV4TaxHook: Only pool manager");
    // ❌ 只验证了poolManager，没有验证poolId的有效性
}
```

**风险**: 
- 恶意的poolManager可能调用Hook
- 没有验证池子的合法性

**修复建议**:
```solidity
// 添加池子白名单验证
mapping(bytes32 => bool) public authorizedPools;

function beforeSwap(...) external returns (bytes4, int256) {
    require(msg.sender == poolManager, "SleepV4TaxHook: Only pool manager");
    require(authorizedPools[poolId], "SleepV4TaxHook: Unauthorized pool");
    // ...
}
```

### **🟢 低危问题**

#### **7. 事件缺失**
- 多个关键操作缺少事件记录
- 建议添加更详细的事件日志

#### **8. 错误消息不够详细**
- 部分require语句的错误消息过于简单
- 建议提供更具体的错误信息

#### **9. 文档和注释**
- 部分复杂逻辑缺少详细注释
- 建议添加更多的内联文档

## 🛠️ **修复优先级**

### **立即修复 (高危)**
1. ✅ 修复税收征收时机问题
2. ✅ 重新设计burn函数或禁用
3. ✅ 添加初始化权限控制

### **尽快修复 (中危)**
4. ✅ 加强时间戳验证
5. ✅ 改进K值验证逻辑
6. ✅ 增强Hook权限验证

### **建议修复 (低危)**
7. ✅ 完善事件系统
8. ✅ 改进错误消息
9. ✅ 补充文档注释

## 🔧 **具体修复代码**

### **修复1: 税收征收时机**
```solidity
function swap(...) external override lock nonReentrant {
    // ... 前置检查 ...
    
    // 1. 先计算税收，但不立即转移
    uint256 taxAmount = 0;
    address taxToken;
    if (taxEnabled && !taxExempt[msg.sender]) {
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        bool isBuy = amount0In > 0;
        uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
        
        if (taxRate > 0) {
            uint256 taxableAmount = isBuy ? amount1In : amount0In;
            taxAmount = TaxCalculator.calculateTaxAmount(taxableAmount, taxRate);
            taxToken = isBuy ? token1 : token0;
        }
    }
    
    // 2. 验证K值（考虑税收影响）
    {
        uint balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
        uint balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
        
        // 如果有税收，从相应的余额中扣除
        if (taxAmount > 0) {
            if (taxToken == token0) {
                balance0Adjusted -= taxAmount * 1000;
            } else {
                balance1Adjusted -= taxAmount * 1000;
            }
        }
        
        require(
            balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * 1000**2,
            'SleepV2Pool: K'
        );
    }
    
    // 3. 最后转移税收
    if (taxAmount > 0) {
        _safeTransfer(taxToken, treasury, taxAmount);
        emit TaxCollected(msg.sender, taxAmount, rates.stage, isBuy);
    }
    
    // ... 更新状态 ...
}
```

### **修复2: 禁用burn函数**
```solidity
function burn(address to) external override returns (uint amount0, uint amount1) {
    revert("SleepV2Pool: Burn not allowed for protocol-owned pool");
}
```

### **修复3: 添加初始化权限**
```solidity
contract SleepV2Pool {
    address public factory;
    
    function initialize(...) external {
        require(msg.sender == factory || factory == address(0), "SleepV2Pool: Only factory");
        require(token0 == address(0), "SleepV2Pool: Already initialized");
        
        if (factory == address(0)) {
            factory = msg.sender;
        }
        
        // ... 初始化逻辑 ...
    }
}
```

## 📊 **风险评估总结**

| 风险等级 | 问题数量 | 状态 |
|----------|----------|------|
| 🔴 高危 | 3 | 需立即修复 |
| 🟡 中危 | 3 | 需尽快修复 |
| 🟢 低危 | 3 | 建议修复 |

## ✅ **审计结论**

Sleep Protocol的池子系统整体架构设计良好，创新性地解决了代币税收与生态兼容性的矛盾。但发现了几个需要立即修复的安全问题，特别是：

1. **税收征收时机问题** - 可能导致K值验证失败
2. **burn函数设计缺陷** - 存在资金安全风险  
3. **权限控制不足** - 可能被恶意利用

**建议**: 在主网部署前必须修复所有高危和中危问题，并进行专业的第三方安全审计。

---

**审计人员**: AI Assistant  
**审计时间**: 2025年10月2日  
**下次审计建议**: 修复完成后进行复审




