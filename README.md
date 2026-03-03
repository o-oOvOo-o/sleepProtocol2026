# XEN Crypto - Sleep Protocol

This repository contains the smart contracts, frontend, and subgraph for the Sleep Protocol, a decentralized application built on the X Layer.

## Project Structure

-   `/contracts`: Solidity smart contracts for the protocol.
-   `/xenfyi-testnet`: The Next.js frontend application.
-   `/subgraph`: The Graph protocol subgraph for indexing blockchain data.
-   `/hardhat`: Hardhat development environment for compiling, testing, and deploying contracts.
-   `/xen-ori`: (Reference Only) Original XEN Crypto contracts.

## Local Development Setup

This project uses a "local-first" development approach, running a Hardhat node, a Graph node, and the frontend application on your local machine for rapid iteration.

### Prerequisites

-   Node.js (v18+)
-   npm (or Yarn)
-   Docker Desktop

### 1. Install Root Dependencies

Navigate to the project root and install the Hardhat dependencies:

```bash
npm install
```

### 2. Install Frontend Dependencies

Navigate to the frontend directory and install its dependencies:

```bash
cd xenfyi-testnet
npm install
cd ..
```

### 3. Install Subgraph Dependencies

Navigate to the subgraph directory and install its dependencies:

```bash
cd subgraph
npm install
cd ..
```

### 4. Running the Local "Iron Triangle"

For a seamless development experience, you should run the three core components in separate terminals from the project root.

**Terminal 1: Start Hardhat Node**

This command starts a local blockchain instance and deploys your contracts to it.

```bash
npx hardhat node
```

**Terminal 2: Start Frontend**

```bash
cd xenfyi-testnet
npm run dev
```

**Terminal 3: Start Local Graph Node**

*(The Docker commands for this step will be added here shortly after we complete the setup.)*

---
### Utility Scripts

**ABI Injection (PowerShell)**

To update the frontend with the latest contract ABI after a change, run this command from the project root:
```powershell
$json = Get-Content -Raw -Path artifacts/contracts/SleepCoin.sol/SleepCoin.json | ConvertFrom-Json; $abiJson = $json.abi | ConvertTo-Json -Depth 100; "export const abi = " + $abiJson + " as const;" | Set-Content xenfyi-testnet/src/abi/SleepCoin.ts -Encoding utf8
```








## 7.4. 行星泵 Swap：下一代可定制税率 DEX 平台

### 7.4.1. 革命性的池层税收架构

Sleep Protocol 在开发过程中创造了一个突破性的技术架构：**池层税收系统**。这个创新完美解决了传统代币内置税收的所有痛点，为整个 DeFi 生态提供了一个全新的解决方案。

**传统方案的问题**：
- ❌ **生态兼容性差**：内置税收的代币无法与大多数 DeFi 协议、聚合器和 CEX 兼容
- ❌ **技术债务**：即使税率降为零，复杂的税收代码仍然存在，永久增加 Gas 成本
- ❌ **用户信任问题**：用户担心项目方随时修改税率，影响代币流通
- ❌ **开发复杂性**：需要在代币合约中实现复杂的税收逻辑，增加安全风险

**行星泵 Swap 的解决方案**：
- ✅ **代币完全标准化**：所有代币保持纯净的 ERC20 标准，100% 兼容所有生态
- ✅ **池层灵活控制**：税收逻辑在交易池层面实现，可以灵活配置和升级
- ✅ **用户完全放心**：代币本身无任何特殊逻辑，用户可以安心持有和转账
- ✅ **项目方便利**：无需修改代币合约，通过我们的平台即可实现税收功能

### 7.4.2. 可定制税率系统

**多维度税率配置**：
```
项目方可以为自己的代币池配置：
- 买入税率：0-10%（可按时间阶段递减）
- 卖出税率：0-15%（可按时间阶段递减）  
- 时间阶段：最多支持 8 个不同阶段
- 分配比例：流动性/质押奖励/销毁的自定义比例
- 特殊豁免：LP 添加、特定地址、特定时间段的税收豁免
```

**智能税率调度**：
- **时间触发**：根据项目启动时间自动调整税率
- **里程碑触发**：根据市值、持币地址数等指标调整税率
- **治理触发**：通过 DAO 投票动态调整税收政策
- **紧急机制**：项目方可设置紧急情况下的税率保护机制

### 7.4.3. 行星泵 Swap 生态平台

**为项目方提供的服务**：

1. **一键部署交易池**：
   - 项目方只需部署标准 ERC20 代币
   - 在行星泵 Swap 平台配置税率参数
   - 自动创建带税收功能的交易池
   - 支持 Uniswap V3 的所有高级功能

2. **税收管理仪表板**：
   - 实时税收收入统计
   - 资金分配流向追踪
   - 税率调整历史记录
   - 社区治理投票界面

3. **流动性引导程序**：
   - 协议拥有流动性（POL）自动管理
   - 社区 LP 激励计划
   - 价格稳定机制
   - 反 MEV 保护

4. **合规和透明度工具**：
   - 税收用途公开透明
   - 资金流向实时可查
   - 智能合约开源审计
   - 社区监督机制

**为用户提供的保障**：

1. **代币安全保障**：
   - 所有代币均为标准 ERC20，无隐藏逻辑
   - 支持所有主流钱包和 DeFi 协议
   - 可在任意 DEX 和 CEX 正常交易
   - P2P 转账永远免税

2. **交易透明度**：
   - 交易前清晰显示税率和实际到账金额
   - 税收去向实时可查
   - 历史税率变更记录公开
   - 无隐藏费用或滑点操控

3. **流动性保护**：
   - 协议锁定流动性提供价格支撑
   - 多池架构分散风险
   - 反 MEV 机制保护用户利益
   - 紧急情况下的流动性保护机制

### 7.4.4. 商业模式和生态价值

**平台收入模式**：
- **池创建费用**：项目方创建定制税率池的一次性费用
- **平台手续费**：从每笔交易中收取小额平台费（0.05-0.1%）
- **高级功能订阅**：高级分析、自动化工具等增值服务
- **技术服务费**：为大型项目提供定制化技术支持

**生态系统效应**：
- **降低项目门槛**：新项目无需复杂的代币经济学设计
- **提升用户信任**：标准化代币让用户更放心参与
- **促进创新**：项目方可专注于产品本身而非技术实现
- **行业标准化**：推动整个行业向更安全、透明的方向发展

**竞争优势**：
- **技术领先**：首个实现池层税收的 DEX 平台
- **用户体验**：无缝集成，对用户完全透明
- **项目友好**：大幅降低项目方的技术和信任成本
- **生态兼容**：与现有 DeFi 生态完美融合

### 7.4.5. 未来发展路线图

**第一阶段：Sleep Protocol 验证**（当前）
- 在 Sleep Protocol 中验证池层税收技术
- 完善税率调度和资金分配机制
- 建立用户界面和管理工具

**第二阶段：平台化开放**（6个月内）
- 开放 SleepSwap 平台给其他项目使用
- 提供项目方自助配置界面
- 建立项目审核和风控机制

**第三阶段：生态扩展**（12个月内）
- 支持多链部署（Ethereum, BSC, Polygon 等）
- 集成更多 DeFi 协议和聚合器
- 推出项目孵化和流动性引导服务

**第四阶段：行业标准**（18个月内）
- 与主流 DEX 和聚合器建立合作
- 推动池层税收成为行业标准
- 建立去中心化治理和协议联盟

**结论**：行星泵 Swap 不仅解决了 Sleep Protocol 自身的税收需求，更为整个 DeFi 行业提供了一个革命性的基础设施。通过将税收逻辑从代币层面提升到交易池层面，我们创造了一个既保持代币纯净性，又满足项目方收入需求的完美解决方案。这个创新有潜力成为下一代 DeFi 项目的标准配置，为 Sleep Protocol 带来巨大的生态价值和商业机会。




npm run verify-subgraph
node scripts/update-configs.ts

   npx ts-node scripts/verify-subgraph-fix.cjs




   # 1. 确保 Docker 运行
# 2. 运行一键脚本
npx ts-node scripts/update-configs.ts

# 3. 选择 1
1

# 4. 等待完成（大约 5-10 分钟）

# 5. 重启前端（如果在运行）
cd xenfyi-testnet
npm run dev