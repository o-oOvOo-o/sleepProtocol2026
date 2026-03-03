#!/bin/bash

echo "🧹 清理旧的 Subgraph..."

# 删除旧的 subgraph
npx graph remove --node http://localhost:8020/ sleep-protocol 2>/dev/null || true

echo "✅ 旧 Subgraph 已删除"

echo ""
echo "🚀 重新创建 Subgraph..."

# 创建新的 subgraph
npx graph create --node http://localhost:8020/ sleep-protocol

echo "✅ Subgraph 已创建"

echo ""
echo "📦 部署 Subgraph..."

# 部署 subgraph
cd subgraph
npx graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 sleep-protocol

echo ""
echo "🎉 Subgraph 重新部署完成！"








