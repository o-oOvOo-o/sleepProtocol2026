# XEN Crypto - Sleep Protocol Dev Log

This log tracks the development progress, key decisions, and technical challenges of the project.

## Sprint 1: Subgraph Integration & Local Environment Setup

**Date:** 2025-09-24

### Key Achievements:

1.  **Smart Contracts Deployed:** All final smart contracts (`SleepMinter`, `StakingRewards`, `TreasuryDistributor`, etc.) have been successfully compiled and deployed to the X Layer Testnet.
2.  **Subgraph Built:** After resolving a series of complex environmental and configuration issues, the `subgraph` for indexing the `SleepMinter` contract was successfully built locally.
3.  **Frontend Connected to Testnet:** The Next.js frontend is fully functional and connected to the deployed contracts on the X Layer Testnet.

### Challenges & Resolutions:

The primary challenge of this sprint was the `subgraph` build process. We encountered a persistent "ghost compilation" error, where the compiler seemed to be using an outdated version of the mapping file (`src/sleep-minter.ts`) despite the file being correct on disk.

**Investigation Steps:**
- Verified code correctness (`subgraph.yaml`, `schema.graphql`, `src/sleep-minter.ts`).
- Verified ABI consistency between `hardhat/artifacts` and `subgraph/abis`.
- Attempted to resolve by clearing local `node_modules` and `build` directories.
- Attempted to resolve by running `npm cache clean --force`.

**Final Resolution:**
The root cause was identified as a globally installed, outdated version of `@graphprotocol/graph-cli`. The conflict was resolved by:
1.  Uninstalling the global package: `npm uninstall -g @graphprotocol/graph-cli`.
2.  Performing a completely clean install of local dependencies within the `subgraph` directory.
3.  Manually verifying that the `src/sleep-minter.ts` file content was correct before the final, successful build.

### Strategic Decisions:

-   **Adopted Local Graph Node for Development:** Due to the The Graph's Hosted Service not supporting X Layer Testnet, we have decided to run a local Graph Node for development and testing.
-   **Targeted Remote Testnet:** The local Graph Node will be configured to index the contracts already deployed on the public X Layer Testnet by connecting to its public RPC. This provides a high-fidelity development environment without needing a local Hardhat node for the indexing part.
-   **X Layer Testnet RPC Found:** The public RPC URL was located within our own frontend configuration: `https://testrpc.xlayer.tech/terigon`.

### Next Steps:

-   Set up the local Graph Node using Docker.
-   Deploy the compiled subgraph to the local node.
-   Integrate the frontend with the local subgraph API.
-   Complete the development of the `/liquidate` page using the subgraph data.

### September 24, 2025: Local Graph Node Setup
- **Action**: Confirmed Docker Desktop (v28.4.0) is installed and running.
- **Next Step**: Clone the official Graph Node repository and configure it using Docker Compose to run a local indexing node.
- **Action**: Cloned `graph-node` repository and successfully started local `graph-node`, `ipfs`, and `postgres` services via Docker Compose.
- **Configuration**: Modified `docker-compose.yml` to point the `ethereum` RPC to X Layer Testnet (`xlayertest:https://testrpc.xlayer.tech`).
- **Deployment Challenge 1**: Initial deployment failed due to a network name mismatch between `subgraph.yaml` (`x-layer-testnet`) and `docker-compose.yml` (`xlayertest`).
- **Resolution 1**: Corrected the network name in `subgraph.yaml` to `xlayertest`.
- **Deployment Challenge 2**: Subsequent deployment failed with an `ECONNRESET` error. Log analysis revealed the X Layer Testnet public RPC was unstable and returning `503 Service Unavailable` errors, causing the local graph-node to terminate the connection.
- **Resolution 2**: After several retries, the deployment command succeeded once the public RPC became stable.
- **Final Resolution**: The user provided a stable, official OKX RPC endpoint (`https://xlayertestrpc.okx.com/terigon`). After updating `docker-compose.yml` to use this new RPC, the deployment succeeded.
- **Status**: Subgraph `sleep-protocol-subgraph` (v0.0.1) is successfully deployed to the local Graph Node and is now indexing data from block `7,824,817` using a stable connection. The GraphQL endpoint is available at `http://127.0.0.1:8000/subgraphs/name/sleep-protocol-subgraph/graphql`.

### September 25, 2025: Frontend Integration & Component Architecture

**Key Achievements:**
1. **Liquidation Page Implementation**: Successfully created `/liquidate` page with full GraphQL integration
2. **Component Extraction**: Extracted reusable `NftCard` and `Pagination` components from inline definitions
3. **Apollo Client Integration**: Configured `ApolloProvider` for subgraph queries alongside existing Wagmi setup

**Critical Bug Resolution - Import/Export Mismatch:**

**Problem**: Persistent `Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined` error that prevented frontend rendering.

**Investigation Process:**
- Initially suspected `ApolloProvider` or other Provider conflicts
- Systematically removed Providers to isolate the issue
- Error persisted even with minimal Provider tree
- Terminal logs revealed specific line numbers: `profile.tsx:78` and `profile.tsx:80`

**Root Cause Identified:**
```typescript
// WRONG - Using named imports for default exports
import { Container } from "~/components/containers/Container";
import { CardContainer } from "~/components/containers/CardContainer";
import { NftCard, MintInfo } from "~/components/NftCard";

// CORRECT - Using default imports for default exports
import Container from "~/components/containers/Container";
import CardContainer from "~/components/containers/CardContainer";
import NftCard, { MintInfo } from "~/components/NftCard";
```

**Technical Details:**
- `Container.tsx`, `CardContainer.tsx`, and `NftCard.tsx` all use `export default ComponentName`
- Pages were incorrectly using destructuring syntax `{ ComponentName }` for default exports
- This caused imported components to be `undefined`, triggering React's "invalid element type" error
- Missing `export default NftCard;` statement in extracted component also contributed to the issue

**Files Affected & Fixed:**
- `xenfyi-testnet/src/pages/profile.tsx` - Fixed Container/CardContainer imports
- `xenfyi-testnet/src/pages/liquidate.tsx` - Fixed Container/CardContainer imports  
- `xenfyi-testnet/src/components/NftCard.tsx` - Added missing `export default NftCard;`

**Prevention Strategy:**
- **Always verify import/export consistency** when extracting components
- **Use TypeScript strict mode** to catch undefined imports at compile time
- **Test component extraction immediately** after refactoring
- **Check terminal logs for specific line numbers** when debugging React rendering errors

**Lesson Learned**: Import/export mismatches are a common source of "undefined component" errors in React. Always ensure that:
1. Default exports use `export default ComponentName`
2. Default imports use `import ComponentName from "path"`
3. Named exports use `export const ComponentName` or `export { ComponentName }`
4. Named imports use `import { ComponentName } from "path"`

**Final Status**: All frontend pages now render correctly with full functionality including NFT display, pagination, and liquidation features.

### September 25-26, 2025: GraphQL Endpoint Configuration & Public Liquidation Feature Complete

**Key Achievements:**
1. **GraphQL Endpoint Issue Resolved**: Fixed critical port configuration that prevented subgraph queries
2. **Public Liquidation Feature Fully Functional**: Complete end-to-end liquidation workflow working
3. **Comprehensive Testing**: Verified all components working with real blockchain data

**Critical Issue Resolution - GraphQL Endpoint Port Configuration:**

**Problem**: Frontend liquidation page showing "No liquidatable NFTs found" despite having test data with 100-day matured NFTs created via developer backdoor.

**Investigation Process:**
- All Docker services (graph-node, postgres, ipfs) running correctly
- Subgraph successfully indexing X Layer Testnet blocks
- GraphQL queries returning JSON-RPC parse errors: `{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"},"id":null}`

**Root Cause Identified:**
```javascript
// WRONG - Using incorrect port for GraphQL queries
const SUBGRAPH_URL = 'http://127.0.0.1:8020/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx';

// CORRECT - Using proper GraphQL query endpoint
const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx';
```

**Graph Node Port Configuration:**
- **Port 8000**: GraphQL query endpoint (for frontend data queries) ✅
- **Port 8001**: GraphQL management endpoint
- **Port 8020**: WebSocket endpoint (not for HTTP GraphQL queries) ❌
- **Port 8030**: Index node server
- **Port 8040**: Metrics endpoint

**Technical Details:**
- Port 8020 was returning JSON-RPC errors because it's designed for WebSocket connections, not HTTP GraphQL queries
- Port 8000 is the correct endpoint for all GraphQL queries from frontend applications
- The subgraph was correctly indexing data, but frontend couldn't access it due to wrong endpoint

**Files Fixed:**
- `xenfyi-testnet/src/pages/liquidate.tsx` - Updated SUBGRAPH_URL to use port 8000

**Verification Results:**
After fixing the endpoint, successful queries returned:
- **5 NFT positions** indexed from blockchain
- **3 matured NFTs** (NFT #1, #2, #5 with 100+ days maturity)
- **1 liquidatable NFT** (NFT #5) meeting the 20-day liquidation threshold
- **Perfect data consistency** with smart contract state

**Final Status**: Public liquidation feature is now fully operational with real-time blockchain data integration.

---

## Complete Deployment & Configuration Guide / 完整部署与配置指南

### English Version

#### Prerequisites
- Node.js 18+ installed
- Docker Desktop running
- Git repository cloned

#### Step 1: Smart Contract Deployment
```bash
# Navigate to project root
cd XEN-crypto-master

# Install dependencies
npm install

# Deploy contracts to X Layer Testnet
npx hardhat run scripts/deploy.ts --network xlayer-testnet

# Note down deployed contract addresses for frontend configuration
```

#### Step 2: Update Frontend Contract Configuration
```bash
# Navigate to frontend directory
cd xenfyi-testnet

# Update contract addresses in src/lib/contracts.ts
# Copy deployed addresses from deployment output
```

#### Step 3: Update Subgraph ABI Files
```bash
# Copy contract ABIs from hardhat artifacts to subgraph
cp ../artifacts/contracts/SleepMinter.sol/SleepMinter.json ../subgraph/abis/

# Update subgraph configuration
cd ../subgraph

# Update contract addresses and start block in subgraph.yaml
# Set network to: xlayertest
# Set address to: <deployed_contract_address>
# Set startBlock to: <deployment_block_number>
```

#### Step 4: Configure and Start Graph Node
```bash
# Navigate to graph node directory
cd ../graph-node/docker

# Update docker-compose.yml with correct RPC endpoint
# Set ethereum: 'xlayertest:https://xlayertestrpc.okx.com/terigon'

# Start Graph Node services
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### Step 5: Build and Deploy Subgraph
```bash
# Navigate back to subgraph directory
cd ../../subgraph

# Install dependencies
npm install

# Generate code from schema
npx graph codegen

# Build subgraph
npx graph build

# Deploy to local Graph Node
npx graph create --node http://127.0.0.1:8020 sleep-protocol-subgraph
npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 sleep-protocol-subgraph
```

#### Step 6: Configure Frontend GraphQL Endpoint
```bash
# Navigate to frontend
cd ../xenfyi-testnet

# Update GraphQL endpoint in liquidation page
# Set SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/id/<SUBGRAPH_ID>'
# Note: Use port 8000 for GraphQL queries, NOT 8020
```

#### Step 7: Start Frontend Development Server
```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev

# Access application at http://localhost:3000
```

#### Step 8: Verify Complete Integration
1. Visit `http://localhost:3000/liquidate`
2. Connect wallet
3. Verify NFT data loads from subgraph
4. Test liquidation functionality

---

### 中文版本

#### 前置条件
- 已安装 Node.js 18+
- Docker Desktop 正在运行
- 已克隆 Git 仓库

#### 步骤 1: 智能合约部署
```bash
# 导航到项目根目录
cd XEN-crypto-master

# 安装依赖
npm install

# 部署合约到 X Layer 测试网
npx hardhat run scripts/deploy.ts --network xlayer-testnet

# 记录部署的合约地址，用于前端配置
```

#### 步骤 2: 更新前端合约配置
```bash
# 导航到前端目录
cd xenfyi-testnet

# 更新 src/lib/contracts.ts 中的合约地址
# 从部署输出中复制已部署的地址
```

#### 步骤 3: 更新 Subgraph ABI 文件
```bash
# 从 hardhat artifacts 复制合约 ABI 到 subgraph
cp ../artifacts/contracts/SleepMinter.sol/SleepMinter.json ../subgraph/abis/

# 更新 subgraph 配置
cd ../subgraph

# 更新 subgraph.yaml 中的合约地址和起始区块
# 设置 network 为: xlayertest
# 设置 address 为: <已部署的合约地址>
# 设置 startBlock 为: <部署区块号>
```

#### 步骤 4: 配置并启动 Graph Node
```bash
# 导航到 graph node 目录
cd ../graph-node/docker

# 更新 docker-compose.yml 中的正确 RPC 端点
# 设置 ethereum: 'xlayertest:https://xlayertestrpc.okx.com/terigon'

# 启动 Graph Node 服务
docker-compose up -d

# 验证服务正在运行
docker-compose ps
```

#### 步骤 5: 构建并部署 Subgraph
```bash
# 返回到 subgraph 目录
cd ../../subgraph

# 安装依赖
npm install

# 从 schema 生成代码
npx graph codegen

# 构建 subgraph
npx graph build

# 部署到本地 Graph Node
npx graph create --node http://127.0.0.1:8020 sleep-protocol-subgraph
npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 sleep-protocol-subgraph
```

#### 步骤 6: 配置前端 GraphQL 端点
```bash
# 导航到前端
cd ../xenfyi-testnet

# 更新清算页面中的 GraphQL 端点
# 设置 SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/id/<SUBGRAPH_ID>'
# 注意：使用端口 8000 进行 GraphQL 查询，不是 8020
```

#### 步骤 7: 启动前端开发服务器
```bash
# 安装前端依赖
npm install

# 启动开发服务器
npm run dev

# 在 http://localhost:3000 访问应用程序
```

#### 步骤 8: 验证完整集成
1. 访问 `http://localhost:3000/liquidate`
2. 连接钱包
3. 验证 NFT 数据从 subgraph 加载
4. 测试清算功能

### 重要端口配置说明 / Important Port Configuration
- **端口 8000**: GraphQL 查询端点（前端数据查询使用）
- **端口 8020**: WebSocket 端点（不用于 HTTP GraphQL 查询）
- **端口 8030**: 索引节点服务器
- **端口 8040**: 指标端点

**关键提醒**: 前端必须使用端口 8000 进行 GraphQL 查询，使用端口 8020 会导致解析错误。

---

## Sprint 2: NFT Marketplace Implementation & Advanced Testing

**Date:** 2025-09-25

### Key Achievements:

1. **NFT Marketplace Smart Contract**: Successfully designed and implemented `NFTMarketplace.sol` with comprehensive trading functionality
2. **Frontend Market Integration**: Created `/market` page with full GraphQL integration for NFT trading
3. **Developer Tools Enhancement**: Added marketplace fee control functionality to `/dev` page
4. **Comprehensive Testing Framework**: Built robust testing scripts for both liquidation and marketplace features
5. **Subgraph Schema Extension**: Enhanced data model to support marketplace entities and relationships

### NFT Marketplace Features Implemented:

**Smart Contract (`NFTMarketplace.sol`):**
- ✅ NFT Listing/Delisting with price management
- ✅ NFT Purchase with SLEEP token payments  
- ✅ Dynamic marketplace fee system (0.5% default, adjustable by owner)
- ✅ Fee distribution to contract owner
- ✅ Emergency withdrawal functionality
- ✅ Full event logging for subgraph indexing

**Frontend Integration:**
- ✅ Market page (`/market`) displaying active listings
- ✅ Profile page integration for listing/delisting NFTs
- ✅ Purchase functionality with transaction confirmations
- ✅ Real-time price display and marketplace statistics
- ✅ Navigation bar integration with Market link

**Developer Tools:**
- ✅ Marketplace fee adjustment controls in `/dev` page
- ✅ Comprehensive testing script (`test-graphql.js`) for both liquidation and marketplace
- ✅ GraphQL schema validation and debugging tools

### Technical Architecture Decisions:

**Marketplace Contract Design:**
```solidity
// Key design patterns implemented:
- ReentrancyGuard for secure token transfers
- Ownable for fee management permissions  
- Dynamic fee structure using basis points (50 = 0.5%)
- Efficient listing management with seller arrays
- Event-driven architecture for subgraph indexing
```

**Subgraph Schema Extension:**
```graphql
# New entities added:
type MarketListing @entity {
  id: ID! # tokenId
  tokenId: BigInt!
  nft: SleepNftPosition!
  seller: Bytes!
  price: BigInt!
  active: Boolean!
  listedAt: BigInt!
}

type MarketSale @entity(immutable: true) {
  # Complete transaction history tracking
}

type MarketStats @entity {
  # Global marketplace analytics
}
```

### Critical Issue Resolution - Subgraph URL Configuration:

**Problem**: Frontend pages showing "Error fetching market data" and empty liquidation results despite successful backend data indexing.

**Root Cause**: Frontend was using outdated subgraph URL format with incorrect endpoint structure:
```javascript
// WRONG - Using old subgraph ID format
const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx';

// CORRECT - Using subgraph name format  
const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/sleep-protocol-subgraph';
```

**Technical Details:**
- Local Graph Node uses name-based routing for deployed subgraphs
- The `/id/` format is used by hosted services, not local deployments
- Both `/liquidate` and `/market` pages were affected by this configuration error
- GraphQL queries were failing with "Type Query has no field marketListings" errors

**Files Fixed:**
- `xenfyi-testnet/src/pages/market.tsx` - Updated SUBGRAPH_URL to use name-based routing
- `xenfyi-testnet/src/pages/liquidate.tsx` - Updated SUBGRAPH_URL to use name-based routing

### Comprehensive Testing Framework:

**Created `test-graphql.js` with full functionality:**
```javascript
// Testing capabilities implemented:
✅ GraphQL endpoint connectivity verification
✅ Liquidatable NFT detection and analysis  
✅ Market listings query and validation
✅ Market statistics tracking
✅ Detailed NFT maturity and penalty calculations
✅ Comprehensive error handling and reporting
```

**Test Results Achieved:**
- **4/4 GraphQL queries passing** ✅
- **1 liquidatable NFT detected** (Token #4, 100+ days overdue)
- **1 active market listing** (Token #3, priced at 0.1 SLEEP)
- **Real-time blockchain data synchronization** confirmed
- **End-to-end functionality verification** completed

### Deployment & Configuration Workflow:

**Enhanced deployment process:**
1. **Smart Contract Deployment**: Extended `scripts/deploy.ts` to include NFTMarketplace
2. **ABI Management**: Automated ABI extraction and frontend integration
3. **Subgraph Configuration**: Updated schema, mappings, and deployment configuration
4. **Frontend Integration**: Contract address updates and GraphQL endpoint configuration
5. **Testing & Validation**: Comprehensive testing framework for continuous verification

### Key Lessons Learned:

**Subgraph URL Management:**
- Always verify endpoint format when switching between hosted and local Graph Nodes
- Use name-based routing for local deployments: `/subgraphs/name/<subgraph-name>`
- Test GraphQL connectivity before debugging application logic

**Smart Contract Integration:**
- Maintain consistent ABI synchronization between contracts and frontend
- Use basis points (e.g., 50 = 0.5%) for precise fee calculations
- Implement comprehensive event logging for subgraph indexing

**Frontend Architecture:**
- Centralize GraphQL endpoint configuration for easy environment switching
- Implement robust error handling for blockchain connectivity issues  
- Use consistent component patterns for NFT display across different contexts

**Testing Strategy:**
- Build comprehensive testing scripts early in development
- Test both happy path and edge cases for blockchain interactions
- Verify data consistency between smart contracts and subgraph indexing

### Final Status:
**✅ NFT Marketplace fully operational with:**
- Complete trading functionality (list, delist, purchase)
- Real-time blockchain data integration
- Comprehensive developer tools and testing framework
- Production-ready smart contract architecture
- Scalable frontend component system

**Next Steps:**
- Performance optimization for large NFT collections
- Advanced filtering and search capabilities
- Mobile-responsive design enhancements
- Additional marketplace analytics and reporting features


### Sprint 3: Automation Pipeline & Subgraph V2

**Date:** 2025-09-27

#### Key Achievements:

1.  **Fully Automated Deployment Pipeline**: Replaced a fragile PowerShell script with a robust, interactive Node.js/TypeScript script, eliminating all previous encoding and YAML formatting errors.
2.  **Subgraph Schema & Mapping Correction**: Identified and fixed the true root causes of persistent subgraph compilation failures.
3.  **Integrated Post-Deployment Health Checks**: The new automation script now automatically verifies the subgraph's status after deployment, providing immediate feedback.

#### From Fragile PowerShell to Robust Node.js: A Case Study in Automation

**Initial Problem**:
Our initial automation script (`update-configs.ps1`) was written in PowerShell. While functional, it suffered from two critical, persistent flaws:
-   **Character Encoding Issues**: The script's output, and the output of the commands it called (like `npx`), frequently displayed garbled characters (乱码) for non-ASCII text and emojis in the Windows terminal.
-   **YAML Indentation Corruption**: The method used to update `subgraph.yaml` (string replacement) was not robust enough for the indentation-sensitive YAML format. It repeatedly broke the file's structure, causing `graph-cli` to fail during deployment.

**The Migration to a TypeScript Solution**:
The decision was made to rewrite the entire automation pipeline in TypeScript, a language and ecosystem we already use for the project. This provided several advantages:
-   **Cross-Platform Consistency**: Node.js scripts behave predictably across different operating systems.
-   **Superior Tooling**: Access to powerful npm libraries for handling complex tasks.
-   **Developer Familiarity**: The entire team can read, maintain, and extend the script easily.

**Technical Implementation (`scripts/update-configs.ts`):**
-   **Interactive Menu**: Implemented using Node.js's native `readline` module to allow developers to choose their deployment strategy (All, Core, or Marketplace only).
-   **Reliable YAML Parsing**: Integrated the `js-yaml` library. Instead of risky string manipulation, the script now programmatically reads the YAML file into a JavaScript object, modifies the necessary properties (`address`, `startBlock`), and then safely dumps it back into a perfectly formatted string. **This completely eradicated the indentation errors.**
-   **ESM Compatibility**: Solved the `__dirname is not defined` error, a common issue in modern Node.js ES Modules, by using the standard `import.meta.url` pattern.
-   **Integrated Health Checks**: Added a new final step using `node-fetch` to query the newly deployed subgraph's `_meta` endpoint, confirming it's online and reporting its sync status.

#### The Real Root Cause: Debugging The Subgraph Compiler

Even with a perfect automation script, the subgraph build continued to fail. This forced a deeper investigation which revealed the true, underlying issues were not in the automation, but in the subgraph's code itself.

**Issue 1: Event Handler Mismatch**
-   **Symptom**: `ERROR TS2305: Module '...' has no exported member 'Mint'`.
-   **Root Cause**: `sleep-minter.ts` contained a `handleMint` function, but the contract emits a standard `Transfer` event for mints.
-   **Fix**: Replaced `handleMint` with `handleTransfer` in the mapping and updated `subgraph.yaml` to listen for the correct `Transfer` event signature.

**Issue 2: The Schema Mismatch (The Final Boss)**
-   **Symptom**: `ERROR TS2339: Property 'tokenId' does not exist on type 'NftClaimEvent'`.
-   **Root Cause**: The `handleRewardClaimed` function was trying to save `tokenId`, `rewardAmount`, and `penaltyAmount`, but these fields were **missing from the `NftClaimEvent` entity definition** in `schema.graphql`. The data model did not match the data being saved.
-   **Fix**: Added the missing `tokenId`, `rewardAmount`, and `penaltyAmount` fields to the `NftClaimEvent` type in `schema.graphql`.

**Issue 3: AssemblyScript Incompatibility**
-   **Symptom**: `ERROR TS2339: Property 'find' does not exist on type 'Array<...>'`.
-   **Root Cause**: The Graph's AssemblyScript environment does not support modern array methods like `.find()`.
-   **Fix**: Replaced the `.find()` method with a standard, compatible `for` loop to iterate through event parameters.

#### Final Outcome: A Bulletproof Workflow

By migrating our tooling and conducting a deep, methodical debugging process, we have achieved a fully automated, one-command deployment workflow:

```bash
npm run config:update
```

This single command now reliably handles the entire lifecycle: **deployment -> configuration -> validation -> subgraph deployment -> health check**. This represents a massive improvement in developer efficiency and deployment safety.

**Next Steps**:
- With a stable foundation, we can now confidently proceed with building and testing new features.
- Begin implementation of the NFT Marketplace listing/delisting UI on the frontend.

