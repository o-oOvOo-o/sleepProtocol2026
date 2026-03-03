# Subgraph 部署指南

## 🚀 一键部署脚本改进

### 主要改进：

#### 1. **自动清理旧 Subgraph**
```typescript
// 自动删除旧版本
- 删除 'sleep-protocol' 
- 删除 'sleep-protocol-subgraph' (旧命名)
- 等待 5 秒让 Graph Node 清理
- 验证删除是否成功
```

#### 2. **非交互式部署**
```bash
# 使用 --version-label 参数
npx graph deploy --version-label v1728721234567 sleep-protocol

# 避免了交互式版本号输入
# 每次使用时间戳确保唯一版本
```

#### 3. **增强验证**
```typescript
// 验证 Subgraph 状态
- 检查是否响应查询
- 验证是否开始索引
- 显示当前区块号
- 检查索引错误
```

## 📋 使用方法

### 方式 1：通过一键部署脚本
```bash
npx ts-node scripts/update-configs.ts
# 选择 4 (Subgraph only)
```

### 方式 2：手动部署
```bash
cd subgraph

# 1. 删除旧 Subgraph
npx graph remove --node http://127.0.0.1:8020/ sleep-protocol

# 2. 重新生成代码
npx graph codegen

# 3. 构建
npx graph build

# 4. 创建
npx graph create --node http://127.0.0.1:8020/ sleep-protocol

# 5. 部署
npx graph deploy --node http://127.0.0.1:8020/ --ipfs http://127.0.0.1:5001 --version-label v$(date +%s) sleep-protocol
```

## 🔍 验证部署

### 测试连接
```bash
npx ts-node scripts/test-subgraph-deploy.ts
```

### 检查 Docker 日志
```bash
# 查看最新日志
docker logs docker-graph-node-1 --tail 100

# 查看 NFTListed 事件
docker logs docker-graph-node-1 | grep "NFTListed"

# 查看错误
docker logs docker-graph-node-1 | grep "ERROR"
```

## 🐛 常见问题

### 1. Subgraph 名称不匹配
**问题**: 前端查询 `sleep-protocol`，但部署的是 `sleep-protocol-subgraph`

**解决**: 
- 前端 URL: `http://localhost:8000/subgraphs/name/sleep-protocol`
- 部署名称: 必须是 `sleep-protocol`

### 2. 旧 Subgraph 没有删除
**症状**: 看到多个 subgraph_id 在运行

**解决**: 
```bash
# 手动删除所有旧版本
npx graph remove --node http://127.0.0.1:8020/ sleep-protocol
npx graph remove --node http://127.0.0.1:8020/ sleep-protocol-subgraph

# 等待 5 秒
# 重新部署
```

### 3. Subgraph 不索引事件
**症状**: `entities: 0` 在所有区块

**可能原因**:
- ABI 不匹配
- Event 签名错误
- 合约地址不匹配
- startBlock 配置错误

**诊断**:
```bash
# 检查 Subgraph 日志
docker logs docker-graph-node-1 --tail 500 | grep "sleep-protocol"

# 检查链上事件
npx hardhat run scripts/find-nft-listed-events.cjs --network xlayertest
```

## 📊 关键指标

### Subgraph 健康检查
- ✅ 当前区块号应该接近链上最新区块
- ✅ `hasIndexingErrors` 应该为 false
- ✅ `entities > 0` 表示已索引到数据
- ✅ GraphQL 查询应该返回数据

### 部署成功标志
```
✅ Subgraph created successfully
✅ Subgraph deployed successfully
✅ Subgraph is responding!
✅ Subgraph is actively indexing blocks
✅ MarketListing saved successfully (在日志中)
```

## 🔧 维护命令

### 重启 Graph Node
```bash
docker restart docker-graph-node-1
```

### 清理所有 Subgraph
```bash
# 停止 Graph Node
docker stop docker-graph-node-1

# 清理数据（谨慎！）
docker exec docker-postgres-1 psql -U graph-node -c "DROP DATABASE graph_node;"
docker exec docker-postgres-1 psql -U graph-node -c "CREATE DATABASE graph_node;"

# 重启
docker start docker-graph-node-1
```

## 📝 配置文件位置

- **前端 Subgraph URL**: `xenfyi-testnet/src/hooks/useSubgraphData.ts`
- **Subgraph 配置**: `subgraph/subgraph.yaml`
- **Subgraph 映射**: `subgraph/src/nft-marketplace.ts`
- **部署信息**: `deployment-info.json`
- **一键部署脚本**: `scripts/update-configs.ts`








