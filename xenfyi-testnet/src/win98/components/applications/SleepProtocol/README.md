# Sleep Protocol 模块化架构

## 📁 文件结构

```
SleepProtocol/
├── index.tsx           # 主入口组件，包含导航和布局
├── types.ts            # TypeScript 类型定义
├── utils.ts            # 共享工具函数
├── Dashboard.tsx       # 仪表板页面
├── Swap.tsx            # 交易页面
├── Mint.tsx            # 铸造页面 (待创建)
├── Stake.tsx           # 质押页面 (待创建)
├── Market.tsx          # 市场页面 (待创建)
├── Profile.tsx         # 个人资料页面 (待创建)
├── Liquidate.tsx       # 清算页面 (待创建)
├── Litepaper.tsx       # 白皮书页面 (待创建)
└── AccessPass.tsx      # Access Pass 页面 (待创建)
```

## 🎯 设计原则

1. **单一职责**: 每个文件只负责一个页面或功能
2. **可维护性**: 代码模块化，易于理解和修改
3. **可复用性**: 共享类型和工具函数统一管理
4. **可扩展性**: 新增页面只需创建新文件并在 index.tsx 中导入

## 📝 已完成的模块

### ✅ index.tsx
- 主入口组件
- 导航菜单
- 页面路由
- 状态栏（语言切换、钱包连接）

### ✅ types.ts
- 所有 TypeScript 接口定义
- `MintForm`, `StakeForm`
- `ElementTransform`, `ElementTransforms`
- `AccessPassDesign`

### ✅ utils.ts
- `safeBigIntConversion`: 安全的 BigInt 转换
- `safeFormatBalance`: 余额格式化
- `ensureArray`: 数组确保函数
- `formatAmountForSvg`: SVG 数字格式化
- `calculateContributionPercent`: 贡献百分比计算

### ✅ Dashboard.tsx
- 仪表板页面
- 余额展示
- 铸造统计
- 质押统计
- 协议参数

### ✅ Mint.tsx
- 美金纸币样式的 Mint 界面
- 翻转卡片动画
- 铸造表单（Count & Term）
- 奖励计算器
- 奖励模拟器
- US Dollar Bill 美学设计

### ✅ Stake.tsx
- Win98 风格 ATM 机界面
- 质押功能
- 取消质押功能
- 查看余额
- 领取奖励
- 数字键盘交互

### ✅ Swap.tsx
- Plasma 风格的 Swap 界面
- Token 交换功能
- 添加流动性功能
- 滑点设置
- 流动性池统计

## 🚀 如何添加新页面

1. 在 `SleepProtocol/` 目录下创建新的 `.tsx` 文件
2. 导出默认的 React 组件
3. 在 `index.tsx` 中导入组件
4. 在 `renderCurrentPage()` 中添加路由

### 示例：添加 Mint 页面

```tsx
// Mint.tsx
import React from 'react';

interface MintProps {
  isConnected: boolean;
  // 其他 props...
}

export const Mint: React.FC<MintProps> = ({ isConnected }) => {
  return (
    <div>
      <h2>Mint Page</h2>
      {/* Mint 功能 */}
    </div>
  );
};
```

```tsx
// index.tsx 中添加
import { Mint } from './Mint';

// 在 renderCurrentPage() 中添加
case 'mint':
  return <Mint isConnected={isConnected} />;
```

## 🔧 已完成的模块

- [x] Mint.tsx - 铸造页面 ✅
- [x] Stake.tsx - 质押页面（ATM 界面） ✅
- [x] Market.tsx - NFT 市场 ✅
- [x] Profile.tsx - 用户资料 ✅
- [x] Liquidate.tsx - 清算页面 ✅
- [x] Litepaper.tsx - 白皮书查看器 ✅
- [x] AccessPass.tsx - Access Pass 设计器 ✅

## 📊 模块依赖关系

```
index.tsx (主入口)
  ├── types.ts (类型定义)
  ├── utils.ts (工具函数)
  ├── Dashboard.tsx
  ├── Swap.tsx
  ├── Mint.tsx
  ├── Stake.tsx
  ├── Market.tsx
  ├── Profile.tsx
  ├── Liquidate.tsx
  ├── Litepaper.tsx
  └── AccessPass.tsx
```

## 🎨 样式规范

- 使用 `styled-components` / `@emotion/styled`
- Win98 风格为主
- Plasma 美元绿为辅（Swap 等特定页面）
- 复用 `../../styles/win98.styles` 中的组件

## 🔄 迁移进度

- [x] 创建模块化结构 ✅
- [x] 拆分 types.ts ✅
- [x] 拆分 utils.ts ✅
- [x] 拆分 Dashboard.tsx ✅
- [x] 拆分 Mint.tsx ✅
- [x] 拆分 Stake.tsx ✅
- [x] 拆分 Swap.tsx ✅
- [x] 拆分 Market.tsx ✅
- [x] 拆分 Profile.tsx ✅
- [x] 拆分 Liquidate.tsx ✅
- [x] 拆分 Litepaper.tsx ✅
- [x] 拆分 AccessPass.tsx ✅
- [x] 更新 SleepProtocolWrapper.tsx ✅
- [x] 更新 index.tsx 导入所有模块 ✅
- [ ] 可选：删除旧的 SleepProtocolDesktop.tsx（已保留作为参考）

## 💡 最佳实践

1. **Props 类型化**: 所有组件都定义 Props 接口
2. **错误处理**: 使用 try-catch 和 toast 提示
3. **加载状态**: 显示适当的加载指示器
4. **响应式设计**: 使用 flexbox 和 grid 布局
5. **国际化**: 使用 `useTranslation` hook

