import styled from '@emotion/styled'
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'next-i18next'
import { useAccount } from 'wagmi'
import 'katex/dist/katex.min.css'
// @ts-ignore
import { InlineMath, BlockMath } from 'react-katex'

import mixins from '../../../styles/mixins.styles'
import MenuBarEntry from '../../MenuBarEntry/MenuBarEntry'
import {
  Win98ButtonStyled,
  Win98Panel,
  Win98TextArea,
  Win98ScrollArea,
  Win98Separator,
} from '../../../styles/win98sm.styles'

const DocsStyled = styled.div`
  width: 1100px;
  height: 700px;
  display: flex;
  flex-direction: column;
`

const DocsMenu = styled.div`
  display: flex;
`

const DocsContainer = styled.div`
  display: flex;
  height: 100%;
  gap: 4px;
  padding: 4px;
  background: #c0c0c0;
`

const TableOfContents = styled(Win98Panel)`
  width: 280px;
  padding: 8px;
  height: fit-content;
  max-height: 600px;
  overflow: hidden;
`

const TocScrollArea = styled(Win98ScrollArea)`
  max-height: 550px;
`

const ContentArea = styled.div`
  flex: 1;
  background: white;
  border: 2px inset #c0c0c0;
  padding: 16px;
  height: fit-content;
  max-height: 600px;
  overflow: hidden;
  position: relative;
`

const ContentScrollArea = styled(Win98ScrollArea)`
  max-height: 560px;
  padding-right: 8px;
  
  /* 添加类名用于跳转定位 */
  &.content-scroll-area {
    scroll-behavior: smooth;
  }
`

const TocItem = styled.div<{ level: number; active?: boolean; hasChildren?: boolean }>`
  display: flex;
  align-items: center;
  padding: 3px ${props => 8 + props.level * 16}px 3px ${props => 4 + props.level * 16}px;
  margin-bottom: 1px;
  font-size: ${props => Math.max(11, 14 - props.level * 0.5)}px;
  background: ${props => props.active ? '#000080' : 'transparent'};
  color: ${props => props.active ? 'white' : 'black'};
  cursor: pointer;
  font-family: 'MS Sans Serif', sans-serif;
  line-height: 1.4;
  border-radius: 0; /* Win98完全方正 */

  &:hover {
    background: ${props => props.active ? '#000080' : '#e0e0e0'};
  }
`

const TocToggle = styled.span<{ expanded: boolean; hasChildren: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 4px;
  font-size: 10px;
  font-family: monospace;
  color: #666;
  visibility: ${props => props.hasChildren ? 'visible' : 'hidden'};
  
  &:before {
    content: '${props => props.expanded ? '▼' : '▶'}';
  }
  
  &:hover {
    color: #000;
    background: rgba(0,0,0,0.1);
    border-radius: 2px;
  }
`

const TocTitle = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LanguageSwitch = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border: 2px inset #c0c0c0;
  padding: 4px;
  background: #c0c0c0;
`

const LanguageButton = styled.button<{ active?: boolean }>`
  padding: 4px 8px;
  font-size: 12px;
  background: ${props => props.active ? '#000080' : '#c0c0c0'};
  color: ${props => props.active ? 'white' : 'black'};
  border: ${props => props.active ? '2px inset #c0c0c0' : '2px outset #c0c0c0'};
  cursor: pointer;
  font-family: 'MS Sans Serif', sans-serif;
  flex: 1;

  &:hover {
    background: ${props => props.active ? '#000080' : '#e0e0e0'};
  }
`

const EditorToolbar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  padding: 4px;
  background: #c0c0c0;
  border: 2px inset #c0c0c0;
  flex-wrap: wrap;
`

const ToolbarButton = styled(Win98ButtonStyled)<{ active?: boolean }>`
  padding: 2px 6px;
  font-size: 11px;
  min-width: 50px;
  margin-right: 2px;
  
  ${props => props.active && `
    background: #000080 !important;
    color: white;
  `}
`

const EnhancedTextarea = styled(Win98TextArea)`
  width: 100%;
  min-height: 400px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
`

const EditButton = styled(Win98ButtonStyled)`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 8px;
  font-size: 12px;
`

const SaveButton = styled(Win98ButtonStyled)`
  position: absolute;
  top: 16px;
  right: 80px;
  padding: 4px 8px;
  font-size: 12px;
  background: #008000;
  color: white;
  
  &:hover {
    filter: brightness(1.1);
  }
`

const RenderedContent = styled.div`
  line-height: 1.6;
  
  h1, h2, h3, h4, h5, h6 {
    color: #000080;
    margin-top: 24px;
    margin-bottom: 12px;
    font-family: 'MS Sans Serif', sans-serif;
    scroll-margin-top: 20px; /* 为锚点跳转留出空间 */
  }
  
  h1 { font-size: 24px; border-bottom: 3px solid #000080; padding-bottom: 8px; }
  h2 { font-size: 20px; border-bottom: 2px solid #808080; padding-bottom: 6px; }
  h3 { font-size: 18px; border-bottom: 1px solid #c0c0c0; padding-bottom: 4px; }
  h4 { font-size: 16px; }
  h5 { font-size: 14px; }
  h6 { font-size: 13px; }
  
  p { margin-bottom: 12px; }
  
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
  }
  
  li { margin-bottom: 4px; }
  
  code {
    background: #f0f0f0;
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    border: 1px solid #d0d0d0;
  }
  
  pre {
    background: #f8f8f8;
    border: 2px inset #c0c0c0;
    padding: 12px;
    margin: 12px 0;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }
  
  blockquote {
    border-left: 4px solid #000080;
    margin: 12px 0;
    padding-left: 16px;
    font-style: italic;
    color: #404040;
  }
  
  hr {
    border: none;
    border-top: 2px solid #808080;
    margin: 20px 0;
  }
  
  a {
    color: #000080;
    text-decoration: underline;
  }
  
  a:hover {
    background: #ffffcc;
  }
  
  strong {
    font-weight: bold;
    color: #000080;
  }
  
  em {
    font-style: italic;
  }
  
  /* 数学公式样式 */
  .math-formula {
    color: #000080;
    font-weight: bold;
    font-family: 'Times New Roman', serif;
  }
  
  .math-display {
    text-align: center;
    margin: 16px 0;
    padding: 12px;
    background: #f8f8f8;
    border: 2px inset #c0c0c0;
    font-size: 16px;
    color: #000080;
    font-family: 'Times New Roman', serif;
  }
  
  /* KaTeX 数学公式自定义样式 */
  .katex-display {
    margin: 24px 0 !important;
    padding: 16px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .katex {
    font-size: 1.15em !important;
    color: #1a1a1a;
  }
  
  .katex .base {
    color: #1a1a1a;
  }
  
  .katex .mathit {
    color: #0066cc;
  }
  
  .katex .mord {
    color: #000000;
  }
  
  .katex .mfrac {
    border-top: 1.5px solid #333;
  }
  
  .katex .mfrac .frac-line {
    border-bottom-width: 1.5px;
    border-bottom-color: #333;
  }
  
  /* 对齐环境样式 */
  .katex .base .amsarray {
    margin: 12px 0;
  }
  
  .katex .align-label {
    color: #666;
  }
`

const DEV_WALLET_ADDRESS = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9'

interface TocEntry {
  id: string;
  title: string;
  level: number;
  line: number;
  children: TocEntry[];
  parent?: TocEntry;
}

const Docs: React.FC = () => {
  const { t } = useTranslation('common')
  const { address } = useAccount()
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'zh'>('en')
  const [isEditing, setIsEditing] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string>('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  // 存储文档内容 - 现在是纯markdown格式
  const [docContent, setDocContent] = useState({
    en: `# Sleep Coin (SLEEPING) Litepaper v1.0

## 1. Ethos: A Fair Launch Experiment in Scarcity and Strategy

Sleep Coin is a decentralized, fair-launch cryptocurrency built on the foundational principles of XEN Crypto's "Proof of Participation." It is designed as a social experiment to explore the interplay of time, scarcity, and strategic decision-making in a trustless environment.

Our ethos is simple:
- **Fair Launch**: No pre-mine, no team allocation, no VC funding. Everyone has the same opportunity to mint from day one. The project team's only advantage is early participation, just like any other user.
- **Proof of Participation**: The only way to create new Sleep Coin is by actively participating in the protocol—claiming a rank and waiting for the term to mature. Your time and commitment are the resources you invest.
- **Engineered Scarcity**: Unlike the original XEN, Sleep Coin introduces multiple deflationary and supply-capping mechanisms to create a system where value is preserved through carefully engineered scarcity.
- **Strategic Depth**: We have designed layers of game theory, including a novel penalty system and dynamic rewards, to create a richer, more engaging experience for participants.

## 2. Tokenomics

- **Token Name**: Sleep Coin
- **Symbol**: SLEEPING
- **Chain**: X Layer (OKB's L2)

### Transaction Tax
To foster a stable ecosystem, prevent "rug pulls," and fund protocol activities, a transaction tax is applied to all buys and sells on decentralized exchanges (DEXs).

- **Phase 1 (First Year Post-Genesis)**:
    - **Buy Tax**: 2%
    - **Sell Tax**: 4%
- **Phase 2 (After One Year)**:
    - **Buy Tax**: 0%
    - **Sell Tax**: 1%

*Peer-to-peer wallet transfers are exempt from this tax.*

## 3. Minting Mechanics

### 3.1. Minting Fee
To prevent Sybil attacks and create a baseline value for the protocol, each minting "unit" requires a fee.
- **Fee**: 0.01 OKB per \`count\` unit claimed.
- **Batch Minting**: Users can mint up to 100 units in a single transaction (represented by one NFT), paying a corresponding fee (e.g., 100 units = 1 OKB).

### 3.2. The XEN-Aligned "Time Fairness" Rank Model
Our core reward calculation is intentionally aligned with the proven economic principles of the original XEN Crypto project. This model emphasizes **"Time Fairness"**, creating a system where a user's long-term commitment (patience) is a more powerful factor in determining rewards than their sheer luck or speed in obtaining an early rank.

This philosophy ensures the protocol remains perpetually attractive to newcomers by providing them with a clear and achievable strategy to compete with, and even surpass, the earliest adopters. The primary strategic lever in our protocol is not *when* you join, but *how long* you are willing to commit.

- **Formula Root**: The final reward is driven by a formula that can be simplified as:

  $$Reward \\approx \\log_2(globalRank - cRank) \\times term \\times other\\_factors$$

- **Key Components**:
    - **\`cRank\` (Your Rank)**: The global rank number you receive at the moment you initiate your mint.
    - **\`globalRank\`**: The constantly increasing total number of ranks claimed in the protocol, representing network growth.
    - **\`term\`**: The number of days you choose to lock your minting position. **This is the most powerful variable you control.**
    - **\`log2\` (Logarithm base 2)**: This is the heart of the model. It drastically dampens the raw *linear difference* between \`globalRank\` and \`cRank\`. This mathematical property is the key to both the model's fairness and its robust anti-inflationary nature.

## 4. The "Strong Wake-up" Penalty Model (10-Day Window)

To encourage active participation and prevent rewards from being locked in "dead wallets," a penalty is applied for delaying reward claims after the minting term matures. This model is designed to be strategic.

- **Phase 1: Rest Period (Days 1-2 Post-Maturity)**
    - **Penalty**: 0%
    - **Rationale**: A grace period for users to claim without stress.

- **Phase 2: Strategic Window (Days 3-5 Post-Maturity)**
    - **Penalty**: Increases linearly by **5%** each day.
        - Day 3: 5%
        - Day 4: 10%
        - Day 5: 15%
    - **Rationale**: The core game theory window. If a user predicts that the \`globalRank\` growth will yield a reward increase greater than the 5% daily penalty, delaying the claim becomes a viable strategy.

## 5. Fee Distribution & Protocol Engine

To ensure long-term sustainability and create a robust, adaptive economic engine, all protocol-generated fees (OKB from minting, SLEEPING from transaction taxes) are managed by the \`TreasuryDistributor\` contract. This contract employs a dynamic allocation model based on the protocol's growth rate.

### 5.1. The 16-Day Epoch
The protocol's operation is divided into 16-day cycles, or "Epochs". At the end of each Epoch, the contract measures the total growth of \`globalRank\` during that period.

### 5.2. Dynamic Allocation Modes
The allocation strategy is determined by the \`globalRank\` growth within the preceding Epoch:

- **"Winter Mode" (Low Growth < 5,000)**: 
    - **55% Protocol-Owned Liquidity (POL)**
    - **40% Staking Rewards**
    - **5% Buy & Burn**

- **"Bull Mode" (High Growth > 50,000)**:
    - **10% Protocol-Owned Liquidity (POL)**
    - **70% Staking Rewards**
    - **20% Buy & Burn**

- **"Standard Mode" (Normal Growth)**: When the 16-day \`globalRank\` growth is between 5,000 and 50,000, the allocation percentages for POL, Staking Rewards, and Buy & Burn are calculated via linear interpolation between the values defined in Winter Mode and Bull Mode. This ensures a smooth and continuous adjustment of the protocol's economic strategy.

  To achieve this, we first calculate an interpolation factor, **α** (alpha), which represents the position of the current growth rate **G** within the range [5,000, 50,000]. **α** scales linearly from 0 to 1.
  
  **Interpolation Factor Formula**:
  
  $$\\alpha = \\frac{G - 5000}{50000 - 5000} = \\frac{G - 5000}{45000}$$
  
  Using this factor, the precise allocation percentage for each pool can be determined with the following formulas:
  
  $$\\begin{align}
  P_{POL} &= 55\\% - \\alpha \\times 45\\% \\\\
  P_{Staking} &= 40\\% + \\alpha \\times 30\\% \\\\
  P_{Burn} &= 5\\% + \\alpha \\times 15\\%
  \\end{align}$$
  
  **Calculation Examples**:
  - When G = 5,000: α = 0, pure Winter Mode (55%, 40%, 5%)
  - When G = 27,500: α = 0.5, middle values (32.5%, 55%, 12.5%)
  - When G = 50,000: α = 1, pure Bull Mode (10%, 70%, 20%)

## 6. Staking Rewards & The Share System

Staking SLEEPING allows users to earn a share of the protocol's OKB revenue through a sophisticated share-based system designed to reward long-term commitment. When you stake your SLEEPING, you receive **Shares** in return.

### 6.1. Rolling Payout Cycles
The protocol's OKB revenue is continuously added to several rolling payout pools:

- **Every 6 Days** (26% of revenue)
- **Every 26 Days** (26% of revenue)  
- **Every 90 Days** (18% of revenue)
- **Every 366 Days** (18% of revenue)
- **Every 666 Days** (12% of revenue)

### 6.2. Earning Shares
The number of Shares you get depends on the **Share Rate** at the time of your stake, plus significant bonuses.

- **\`LongerPaysMore\` Bonus**: The longer you stake for, the more shares you get. This bonus increases with stake length, up to a maximum **+206% bonus** for stakes of 1500 days or longer.

### 6.3. Staking Penalties
- **Minimum Stake Length**: 26 days.
- **Early End Stake**: Stakes cannot be ended before 50% of their term is complete. **50% penalty** applies if ended early.
- **Late End Stake**: **6-day grace period** after maturity. After that, **1.45% penalty per day**. Liquidation eligible when penalty exceeds **50%** of principal.

## 7. Core Innovations: A Tradable Financial NFT Ecosystem

Sleep Protocol introduces two revolutionary innovations that transform traditional DeFi's "dead money" into "living assets," creating unprecedented capital efficiency and liquidity for users.

### 7.1. Minting Position NFTization

**Innovation Mechanism**:
When users participate in minting, the protocol doesn't simply record a "ledger entry." Instead, it mints a **Minting Position NFT** for the user. This NFT completely encapsulates the user's entire minting position, including:
- Minting term and maturity date
- Minting count and global rank
- Expected reward calculation parameters  
- Dynamic visual status (active/mature/penalty/liquidated)

**Breakthrough Value**:
- **Instant Liquidity**: Users can monetize their positions without waiting for the minting term to end
- **Risk Transfer**: Transfer risk to investors who are more bullish on the project
- **Investment Portfolios**: Build diversified "minting term portfolios" by purchasing different NFTs
- **Price Discovery**: Secondary markets automatically price positions with different terms and ranks

### 7.2. Staking Position NFTization (Access Pass NFT)

**Innovation Mechanism**:
Sleep Protocol's staking system abandons the traditional "liquidity pool" model, instead using **Access Pass NFTs** as staking certificates. These NFTs are not just "receipts," but fully functional **digital savings cards**:

- **True NFT Ownership (ERC-6551)**: Each Access Pass NFT is powered by ERC-6551 Token Bound Accounts, meaning each NFT has its own smart contract wallet address. Users' $SLEEPING tokens are directly owned by the NFT itself, not stored in a centralized contract.
  
  **Why ERC-6551 over ERC-3525?**
  While ERC-3525 (Semi-Fungible Tokens) allows for divisible financial assets like bonds that can be split and merged, ERC-6551 provides far superior functionality for our use case:
  - **Full Wallet Capability**: Each NFT is a complete smart contract wallet, not just a divisible asset
  - **Universal Asset Holding**: Can hold any token type (ERC-20, ERC-721, ETH) without limitations
  - **DeFi Composability**: Direct interaction with any DeFi protocol (lending, DEX, yield farming)
  - **Future-Proof Design**: Unlimited expansion potential for new financial products
  - **True Self-Custody**: Users maintain complete control over their assets through their NFT
- **Share Rights Ledger**: The \`StakingRewards\` contract acts as a pure "ledger," recording each NFT's corresponding staking amount and share rights, while the actual tokens remain under the NFT's direct control.
- **Personalized Design**: Each Access Pass supports custom SVG design, allowing users to create unique digital identity markers.
- **Real-time Data Display**: NFT images dynamically show holder addresses, staking amounts, claimable rewards, and other real-time information.

**Breakthrough Value**:
- **Revolutionary Security**: Each NFT literally owns its staked assets through its dedicated smart contract wallet. This is the ultimate form of self-custody - your tokens belong to your NFT, not to any protocol contract.
- **Complete Liquidity**: Long-term staking positions can be freely traded on NFT markets, with buyers inheriting both the staking position and accumulated share rights. The NFT's wallet address transfers with ownership.
- **Unlimited Composability**: Each Access Pass can hold any assets and interact with any DeFi protocol. Your NFT can stake, lend, trade, or farm across the entire ecosystem autonomously.
- **Social Attributes**: Custom SVG functionality elevates staking from pure financial behavior to personal expression and social display.
- **Portfolio Investment**: Investors can purchase multiple Access Passes with different staking durations and share right ratios to build personalized yield portfolios.

### 7.3. Ecosystem Synergy Effects

These two innovations together create an **unprecedented tradable financial ecosystem**:

**Unified Secondary Market**:
- Minting rights, staking rights, and dividend rights all trade in the same NFT marketplace
- Users can manage complex DeFi positions using familiar platforms like OpenSea and Blur
- Lowers DeFi participation barriers and expands the potential user base

**Value Redistribution**:
- Risk-averse users can sell long-term positions to risk-seeking investors
- Liquidity demanders can immediately cash out while liquidity providers get discounted acquisition opportunities
- Forms an efficient market for risk and yield redistribution

**Innovative Financial Products**:
- NFT-based collateral lending: Use Access Pass as collateral for loans
- Term arbitrage: Arbitrage trading between positions with different maturities
- Yield farming: Specialized acquisition of high-yield NFTs nearing maturity

**Conclusion**: Sleep Protocol is not just a token project, but a pioneering "**tradable financial rights infrastructure**" that explores entirely new directions for capital efficiency maximization across the DeFi industry.

## 8. Technical Architecture: Why We Chose ERC-6551

### 8.1. NFT Standard Comparison

**ERC-721 (Traditional NFTs)**
- ✅ Unique digital assets
- ❌ Cannot hold other assets
- ❌ Limited DeFi interaction
- ❌ Static value proposition

**ERC-3525 (Semi-Fungible Tokens)**
- ✅ Divisible financial assets
- ✅ Can represent fractional ownership
- ❌ Limited to quantity-based operations
- ❌ Cannot hold diverse asset types
- ❌ Restricted composability

**ERC-6551 (Token Bound Accounts)**
- ✅ Each NFT is a full smart contract wallet
- ✅ Can hold unlimited asset types
- ✅ Full DeFi protocol compatibility
- ✅ Unlimited composability and extensibility
- ✅ True self-custody model

### 8.2. Real-World Use Case Scenarios

**Scenario 1: Traditional Staking**
- User deposits tokens → Centralized pool
- Risk: Protocol controls all funds
- Liquidity: Zero (locked until unstake)

**Scenario 2: ERC-3525 Approach**
- User gets divisible staking NFT
- Can split/merge staking positions
- Risk: Still protocol-controlled funds
- Liquidity: Limited to NFT marketplace

**Scenario 3: Our ERC-6551 Solution**
- User's NFT literally owns the staked tokens
- NFT can participate in other DeFi protocols simultaneously
- Risk: User retains full control
- Liquidity: Complete secondary market + DeFi interactions

### 8.3. Future Expansion Possibilities

With ERC-6551, each Access Pass NFT can:
- **Yield Farm**: Automatically stake rewards in other protocols
- **Leverage Trade**: Use staked assets as collateral for borrowing
- **Cross-Chain Bridge**: Hold assets across multiple blockchains
- **DAO Participation**: Vote in multiple governance protocols
- **Automated Strategies**: Execute complex DeFi strategies autonomously

This level of composability is impossible with traditional staking or ERC-3525 models.

## Getting Started Guide

### Prerequisites
Before you begin, ensure you have:
- **Web3 Wallet**: MetaMask, OKX Wallet, or any WalletConnect-compatible wallet
- **OKB for Fees**: Sufficient OKB for minting fees and gas
- **Basic DeFi Knowledge**: Understanding of staking, minting, and smart contract risks

### Core Components

#### Staking Contract
Manages user deposits and withdrawals with the following features:
- Secure fund custody
- Automated reward calculations
- Flexible staking periods
- Emergency withdrawal mechanisms

#### Reward Distributor
Calculates and distributes rewards based on:
- Staking duration
- Amount staked
- Current APY rates
- Bonus multipliers

#### Governance Module
Handles protocol upgrades and decisions through:
- Proposal creation and voting
- Time-locked upgrades
- Multi-signature requirements
- Community participation

### Security Features

1. **Multi-signature requirements** for critical operations
2. **Time-locked upgrades** to prevent malicious changes
3. **Emergency pause mechanisms** for crisis situations
4. **Comprehensive testing suite** with 100% code coverage

## Staking Mechanisms

Sleep Protocol offers multiple staking options designed to accommodate different risk preferences and investment strategies.

### Standard Staking

- **Lock Period**: 30-365 days
- **Rewards**: OKB + SLEEP tokens
- **APY**: 8-25% (varies by lock period)
- **Early Exit**: Penalty applies (1-5%)

#### Reward Calculation

\`\`\`
Base Reward = (Staked Amount × APY × Time) / 365
Final Reward = Base Reward × Multiplier × Bonus
\`\`\`

#### Multipliers

- **Lock Period Bonus**: 1.0x - 2.5x
- **Governance Participation**: +0.2x
- **Early Adopter Bonus**: +0.5x (first 6 months)

### Liquid Staking

For users who need flexibility:

- **Lock Period**: None
- **Rewards**: Lower rates but instant liquidity
- **APY**: 3-8%
- **Early Exit**: No penalty

### Governance Staking

Enhanced rewards for active participants:

- **Lock Period**: Minimum 90 days
- **Rewards**: Enhanced multipliers up to 3.0x
- **Voting Power**: 1:1 ratio with staked amount
- **Benefits**: Protocol fee discounts up to 50%

## Tokenomics

Sleep Protocol implements a sophisticated dual-token economic model designed for sustainable growth and value accrual.

### SLEEP Token

- **Total Supply**: 100,000,000 SLEEP
- **Initial Distribution**:
  - 60% Community rewards and incentives
  - 20% Team (4-year vesting)
  - 20% Treasury and development
- **Utility**: Governance, Staking, Fee Discounts
- **Inflation**: Capped at 2% annually after year 2

### OKB Integration

- **Primary Reward Token**: OKB from OKX ecosystem
- **Reward Pool**: Funded by protocol fees and partnerships
- **Cross-chain Support**: Multi-chain OKB distribution
- **Liquidity**: Deep OKX exchange integration

### Fee Structure

#### Staking Fees
- **Deposit Fee**: 0.1% on all deposits
- **Performance Fee**: 10% of earned rewards
- **Early Exit Fee**: 1-5% (decreases linearly over time)

#### Governance Fees
- **Proposal Fee**: 0.05% of treasury for spam prevention
- **Execution Fee**: 0.01% for successful proposals

### Revenue Distribution

Our sustainable fee model distributes revenue as follows:

1. **50% → Staker Rewards** - Direct rewards to participants
2. **30% → Protocol Treasury** - Long-term sustainability
3. **15% → Development Fund** - Continuous improvements
4. **5% → Insurance Pool** - Risk mitigation

## API Reference

Sleep Protocol provides comprehensive APIs for developers building on top of the protocol.

### Smart Contract Interfaces

#### SleepStaking.sol

\`\`\`solidity
function stake(uint256 amount, uint256 duration) external;
function unstake(uint256 stakeId) external;
function claimRewards(uint256 stakeId) external;
function getStakeInfo(address user, uint256 stakeId) external view returns (StakeInfo);
\`\`\`

#### RewardDistributor.sol

\`\`\`solidity
function distributeRewards() external;
function calculateReward(address user, uint256 stakeId) external view returns (uint264);
function setRewardRate(uint256 newRate) external onlyOwner;
\`\`\`

#### Governance.sol

\`\`\`solidity
function propose(string memory description, address[] memory targets, bytes[] memory calldatas) external;
function vote(uint256 proposalId, bool support) external;
function execute(uint256 proposalId) external;
\`\`\`

### Web3 Integration

#### React Hooks

We provide custom React hooks for easy integration:

- **useStaking()** - Staking operations and state management
- **useRewards()** - Reward tracking and claiming
- **useGovernance()** - Governance participation

#### TypeScript Types

Complete type definitions for:
- StakeInfo, RewardData, ProposalData
- Event types and error handling
- Contract interaction utilities

### REST API Endpoints

#### User Data
- \`GET /api/stakes/{address}\` - User stakes and history
- \`GET /api/rewards/{address}\` - Reward history and pending rewards
- \`GET /api/profile/{address}\` - Complete user profile

#### Protocol Data
- \`GET /api/stats\` - Protocol statistics and metrics
- \`GET /api/proposals\` - Governance proposals and voting
- \`GET /api/apy\` - Current APY rates and projections

### Rate Limits

- **Public API**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per API key
- **WebSocket**: 10 concurrent connections per IP

## User Guide

### Getting Started with Sleep Protocol

This comprehensive guide will walk you through every step of using Sleep Protocol, from initial setup to advanced features.

#### Prerequisites

Before you begin, ensure you have:
- **Web3 Wallet**: MetaMask, OKX Wallet, or any WalletConnect-compatible wallet
- **ETH for Gas**: Sufficient Ethereum for transaction fees
- **SLEEP Tokens**: Available on supported DEXs or earned through protocol activities
- **Basic DeFi Knowledge**: Understanding of staking, APY, and smart contract risks

#### Step 1: Wallet Setup

1. **Install Wallet Extension**
   - Download MetaMask from metamask.io
   - Or install OKX Wallet from okx.com/web3
   - Create a new wallet or import existing seed phrase

2. **Network Configuration**
   - Ensure you're connected to Ethereum Mainnet
   - Add custom networks if using Layer 2 solutions
   - Verify network settings match our supported chains

3. **Security Best Practices**
   - Never share your seed phrase or private keys
   - Use hardware wallets for large amounts
   - Enable all available security features

#### Step 2: Acquiring SLEEP Tokens

1. **Purchase Options**
   - **Uniswap**: Swap ETH or other tokens for SLEEP
   - **OKX DEX**: Direct trading with deep liquidity
   - **1inch**: Best price aggregation across DEXs

2. **Token Contract Verification**
   - Always verify the official SLEEP token contract address
   - Check on Etherscan before any transactions
   - Beware of fake or scam tokens

#### Step 3: Your First Stake

1. **Connect to Sleep Protocol**
   - Visit the official Sleep Protocol dApp
   - Click "Connect Wallet" in the top right
   - Approve the connection request

2. **Token Approval**
   - Click "Approve SLEEP" if prompted
   - Set approval amount (recommend unlimited for convenience)
   - Confirm the approval transaction

3. **Choose Staking Options**
   - **Standard Staking**: Higher rewards, locked period
   - **Liquid Staking**: Lower rewards, instant liquidity
   - **Governance Staking**: Maximum rewards, voting rights

4. **Execute Stake**
   - Enter desired amount (minimum 1 SLEEP)
   - Select lock period (30-365 days for standard)
   - Review all details carefully
   - Confirm transaction and pay gas fees

#### Step 4: Managing Your Stakes

1. **Dashboard Overview**
   - View all active stakes
   - Monitor reward accumulation
   - Track lock period countdown

2. **Claiming Rewards**
   - Rewards accrue automatically
   - Click "Claim" to withdraw to wallet
   - Consider gas costs vs reward amounts

3. **Unstaking Process**
   - Available only after lock period expires
   - Early unstaking incurs penalty fees
   - Process may take 1-2 blocks to complete

#### Step 5: Advanced Features

1. **Governance Participation**
   - Stake in governance pools for voting rights
   - Participate in protocol decisions
   - Earn bonus rewards for active participation

2. **Reward Optimization**
   - Compound rewards by restaking
   - Time entries for maximum efficiency
   - Monitor APY changes and adjust strategy

3. **Multi-chain Operations**
   - Bridge tokens between supported chains
   - Optimize for lower gas fees
   - Maintain security across networks

### Troubleshooting Common Issues

#### Transaction Failures
- **Insufficient Gas**: Increase gas limit or price
- **Token Approval**: Ensure SLEEP is approved for staking
- **Network Issues**: Check connection and try again

#### Missing Rewards
- **Sync Delay**: Wait 1-2 blocks for updates
- **Browser Cache**: Clear cache and refresh
- **Network Switch**: Ensure correct network selected

#### Wallet Connection Problems
- **Browser Conflicts**: Try incognito mode
- **Extension Updates**: Update wallet extension
- **Network Reset**: Reset network settings in wallet

## Disclaimer

### Important Legal and Financial Disclaimers

**READ CAREFULLY BEFORE USING SLEEP PROTOCOL**

Sleep Protocol is an experimental decentralized finance (DeFi) protocol. By using Sleep Protocol, you acknowledge and accept the following risks and disclaimers:

#### Financial Risk Disclaimer

1. **Total Loss of Funds**
   - Cryptocurrency investments carry extreme risk
   - You may lose some or all of your deposited funds
   - Past performance does not guarantee future results
   - APY rates are estimates and subject to change

2. **Market Volatility**
   - Cryptocurrency prices are highly volatile
   - Token values can fluctuate dramatically
   - Rewards may not compensate for token depreciation
   - Market conditions affect all DeFi protocols

3. **Impermanent Loss**
   - Staking does not protect against token price decline
   - Opportunity cost of locking funds
   - Inflation may erode real value of rewards

#### Technical Risk Disclaimer

1. **Smart Contract Risk**
   - Smart contracts may contain bugs or vulnerabilities
   - Code audits do not guarantee complete security
   - Exploits or hacks may result in fund loss
   - Protocol upgrades may introduce new risks

2. **Blockchain Risk**
   - Network congestion may delay transactions
   - Gas fees can be unpredictable and expensive
   - Blockchain reorganizations may affect transactions
   - Network upgrades may impact protocol functionality

3. **Third-Party Risk**
   - Reliance on external oracles and data feeds
   - Integration risks with other protocols
   - Wallet software vulnerabilities
   - Exchange and bridge risks

#### Regulatory Risk Disclaimer

1. **Legal Uncertainty**
   - DeFi regulations are evolving rapidly
   - Future laws may restrict or prohibit use
   - Tax implications vary by jurisdiction
   - Compliance requirements may change

2. **Geographic Restrictions**
   - Service may not be available in all regions
   - Users responsible for local law compliance
   - Sanctions and restricted jurisdictions apply
   - VPN use does not circumvent legal restrictions

#### Operational Risk Disclaimer

1. **Protocol Governance**
   - Governance decisions may negatively impact users
   - Voting outcomes are not guaranteed to be favorable
   - Protocol changes may alter risk/reward profiles
   - Emergency actions may limit user access

2. **Liquidity Risk**
   - Unstaking may be delayed or restricted
   - Emergency pause mechanisms may prevent withdrawals
   - Market conditions may affect exit liquidity
   - Lock periods are strictly enforced

#### No Investment Advice

1. **Educational Purpose Only**
   - This documentation is for informational purposes
   - Not financial, investment, or legal advice
   - Consult qualified professionals before investing
   - Make independent investment decisions

2. **No Guarantees**
   - No guarantee of profits or returns
   - Protocol functionality not guaranteed
   - Service availability not guaranteed
   - Support response not guaranteed

#### User Responsibilities

1. **Due Diligence**
   - Research and understand all risks
   - Verify all information independently
   - Test with small amounts initially
   - Monitor positions regularly

2. **Security Practices**
   - Secure your private keys and seed phrases
   - Use reputable wallets and security practices
   - Verify all contract addresses
   - Be aware of phishing attempts

3. **Legal Compliance**
   - Comply with all applicable laws
   - Report taxes as required
   - Understand local regulations
   - Seek legal advice if uncertain

#### Limitation of Liability

1. **No Warranties**
   - Protocol provided "as is" without warranties
   - No guarantee of uninterrupted service
   - No warranty of fitness for particular purpose
   - All warranties expressly disclaimed

2. **Damage Limitations**
   - Developers not liable for any damages
   - Users assume all risks of participation
   - Maximum liability limited to amount invested
   - Consequential damages explicitly excluded

#### Contact and Support

1. **Community Support**
   - Discord community for peer assistance
   - GitHub for technical issues and bugs
   - Documentation for protocol information
   - No official customer support guaranteed

2. **Emergency Procedures**
   - Monitor official channels for announcements
   - Follow emergency procedures if announced
   - Governance may implement emergency measures
   - Users responsible for staying informed

**BY USING SLEEP PROTOCOL, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND ACCEPT ALL TERMS OF THIS DISCLAIMER. IF YOU DO NOT ACCEPT THESE TERMS, DO NOT USE THE PROTOCOL.**

**This disclaimer was last updated on [DATE] and may be modified at any time without notice.**

## FAQ

### General Questions

#### What is Sleep Protocol?

Sleep Protocol is a decentralized finance (DeFi) protocol that allows users to stake tokens and earn rewards through innovative time-based mechanisms and dynamic fee structures.

#### How do I start using Sleep Protocol?

1. **Connect Wallet**: Use MetaMask, OKX Wallet, or any Web3-compatible wallet
2. **Get SLEEP Tokens**: Purchase on supported exchanges or earn through protocol activities
3. **Choose Staking Option**: Select from Standard, Liquid, or Governance staking
4. **Stake and Earn**: Confirm transaction and start earning rewards immediately

#### What wallets are supported?

We support all major Web3 wallets including:
- MetaMask
- OKX Wallet
- WalletConnect
- Coinbase Wallet
- Trust Wallet

### Staking Questions

#### What is the minimum staking amount?

The minimum stake is **1 SLEEP token** to ensure accessibility for all users.

#### Can I stake multiple times?

Yes! Each stake is tracked separately with its own terms, rewards, and unlock schedule. You can have unlimited active stakes.

#### What happens if I unstake early?

Early unstaking incurs a penalty fee that:
- Starts at 5% immediately after staking
- Decreases linearly to 1% over the lock period
- Reaches 0% at the end of the lock period

#### How often are rewards distributed?

- **Accrual**: Rewards accrue continuously in real-time
- **Distribution**: Automatic weekly distribution to your wallet
- **Manual Claim**: Available anytime through the dashboard

### Technical Questions

#### Is the protocol audited?

Yes, Sleep Protocol has undergone comprehensive security audits by:
- **Certik** - Smart contract security audit
- **Quantstamp** - Economic model review
- **Trail of Bits** - Formal verification

All audit reports are publicly available on our website.

#### What blockchain networks are supported?

- **Primary**: Ethereum Mainnet
- **Planned**: Arbitrum, Optimism, Polygon
- **Cross-chain**: Bridge functionality for multi-chain operations

#### How can I view the smart contract code?

All contracts are verified and open source:
- **Etherscan**: Verified contract code and interactions
- **GitHub**: Complete source code and documentation
- **Documentation**: Detailed technical specifications

### Troubleshooting

#### My transaction failed, what should I do?

Common solutions:
1. **Check Gas**: Ensure sufficient ETH for gas fees
2. **Token Approval**: Verify SLEEP token is approved for staking
3. **Network**: Confirm you're connected to the correct network
4. **Amount**: Verify staking amount meets minimum requirements

#### I can't see my rewards

- **Wait Time**: Rewards may take 1-2 blocks to appear (2-4 minutes)
- **Refresh**: Try refreshing the page or reconnecting wallet
- **Network**: Ensure you're on the correct network
- **Contact**: Join our Discord for real-time support

#### How do I contact support?

- **Discord**: Join our community server for instant help
- **Email**: support@sleepprotocol.io for detailed inquiries
- **Documentation**: Check this FAQ and documentation first
- **GitHub**: Report technical issues and bugs`,
    zh: `# Sleep Coin ($SLEEPING) 代币经济学白皮书 v1.0

## 1. 核心精神：一次关于稀缺性与策略的公平启动实验

Sleep Coin 是一种去中心化的、公平启动的加密货币，它建立在 XEN Crypto "参与即证明"的核心原则之上。它被设计成一个社会实验，旨在探索在一个无需信任的环境中，时间、稀缺性与战略决策之间的相互作用。

我们的核心精神很简单：
- **公平启动**: 无预挖，无团队份额，无风险投资。从第一天起，每个人都有相同的机会进行铸币。项目团队唯一的优势，就像其他任何用户一样，仅仅是早期参与。
- **参与即证明**: 创造新的 Sleep Coin 的唯一方式，就是积极地参与协议——领取一个排名，并等待所选的期限成熟。您的时间和承诺，就是您所投资的资源。
- **精心设计的稀缺性**: 与原始的 XEN 不同，Sleep Coin 引入了多种通缩和供应上限机制，旨在通过精心设计的稀缺性来维持价值。
- **战略深度**: 我们设计了多层博弈论机制，包括一个新颖的惩罚系统和动态奖励，旨在为参与者创造一个更丰富、更具吸引力的体验。

## 2. 代币经济学

- **代币名称**: Sleep Coin
- **代号**: $SLEEPING
- **所在链**: X Layer (OKB 的二层网络)

### 交易税
为了培育一个稳定的生态系统，防止"釜底抽薪"（rug pulls），并为协议活动提供资金，所有在去中心化交易所（DEX）上的买卖行为都将被征收交易税。每半年调整一次税率，逐步降低至零。

- **第一阶段 (创世后前6个月)**:
    - **购买税**: 2%
    - **出售税**: 5%
- **第二阶段 (6个月-1年)**:
    - **购买税**: 2%
    - **出售税**: 4%
- **第三阶段 (1年-1.5年)**:
    - **购买税**: 1%
    - **出售税**: 3%
- **第四阶段 (1.5年后)**:
    - **购买税**: 0%
    - **出售税**: 0%

*点对点的钱包转账免除此税。*

## 3. 铸币机制

### 3.1. 铸币费
为防止女巫攻击并为协议创造基础价值，每个铸币"单位"都需要支付费用。
- **费用**: 每 \`count\` 单位需支付 0.01 OKB
- **批量铸币**: 用户可在单笔交易中最多铸造 100 个单位（由一个 NFT 代表），并支付相应费用

### 3.2. 与 XEN 一致的"时间公平"排名模型
我们的核心奖励计算模型与经过验证的 XEN Crypto 经济原则保持一致。该模型强调**"时间公平性"**，创建一个系统，用户的长期承诺（耐心）比其排名更重要。

这一设计哲学确保协议对新来者永远具有吸引力，为他们提供清晰、可实现的策略来与早期采用者竞争，甚至超越他们。

- **公式核心**: 最终奖励由简化公式驱动：

  $$奖励 \\approx \\log_2(全局排名 - 你的排名) \\times 期限 \\times 其他因子$$

- **关键组成部分**:
    - **\`cRank\` (你的排名)**: 你在发起铸币时获得的全局排名编号
    - **\`globalRank\` (全局排名)**: 协议中已被领取的总排名数量，代表网络增长
    - **\`term\` (期限)**: 你选择锁定铸币仓位的天数。**这是你能控制的最强大变量**
    - **\`log2\` (以2为底的对数)**: 模型的心脏，极大削弱排名差距的线性影响

## 4. "强力唤醒"惩罚模型 (10天窗口)

为鼓励积极参与并防止奖励被锁在"死钱包"中，对铸币期限成熟后延迟领取奖励的行为设置惩罚。

- **第一阶段: 休息期 (成熟后1-2天)**
    - **惩罚**: 0%
    - **理由**: 无压力领取的宽限期

- **第二阶段: 战略窗口期 (成熟后3-5天)**
    - **惩罚**: 每日线性增加 **5%**
    - **理由**: 核心博弈论窗口。如果预测增长收益超过5%日惩罚，延迟领取成为可行策略

## 5. 费用分配与协议引擎

为确保长期可持续性，所有协议费用由 \`TreasuryDistributor\` 合约管理，采用基于增长率的动态分配模型。

### 5.1. 16天周期 (Epoch)
协议运行被划分为16天周期。每个周期结束时，合约衡量 \`globalRank\` 总增长量，决定下个周期的费用分配比例。

### 5.2. 动态分配模式
分配策略由上一周期的 \`globalRank\` 增长量决定：

- **"寒冬模式" (低增长 < 5,000)**:
    - **55% 协议拥有的流动性 (POL)**
    - **40% 质押奖励**  
    - **5% 回购销毁**

- **"牛市模式" (高增长 > 50,000)**:
    - **10% 协议拥有的流动性 (POL)**
    - **70% 质押奖励**
    - **20% 回购销毁**

- **"标准模式" (正常增长)**: 当16天的 \`globalRank\` 增长量在5,000和50,000之间时，POL、质押奖励和回购销毁的分配百分比通过线性插值法在寒冬模式和牛市模式之间进行计算。这确保了协议的经济策略在增长过程中保持平滑和连续。

  为此，我们首先计算一个插值因子，**α** (alpha)，它表示当前增长率 **G** 在[5,000, 50,000]范围内的位置。**α** 线性从0到1缩放。
  
  **插值因子计算公式**：
  
  $$\\alpha = \\frac{G - 5000}{50000 - 5000} = \\frac{G - 5000}{45000}$$
  
  使用这个因子，每个池的精确分配百分比可以通过以下公式确定：
  
  $$\\begin{align}
  P_{协议流动性} &= 55\\% - \\alpha \\times 45\\% \\\\
  P_{质押奖励} &= 40\\% + \\alpha \\times 30\\% \\\\
  P_{回购销毁} &= 5\\% + \\alpha \\times 15\\%
  \\end{align}$$
  
  **实际计算示例**：
  - 当 G = 5,000 时：α = 0，完全是寒冬模式 (55%, 40%, 5%)
  - 当 G = 27,500 时：α = 0.5，中间值 (32.5%, 55%, 12.5%)
  - 当 G = 50,000 时：α = 1，完全是牛市模式 (10%, 70%, 20%)

## 6. 质押奖励 & 分红权系统

质押 $SLEEPING 可通过复杂的基于分红权的系统赚取协议的 OKB 收入。当您质押时，会获得相应的**分红权 (Shares)**。

### 6.1. 滚仓分红周期
协议的 OKB 收入持续注入多个不同周期的滚仓奖池：

- **每6天** (25%收入)
- **每30天** (25%收入)
- **每90天** (17%收入)  
- **每360天** (17%收入)
- **每720天** (16%收入)

这个系统创造了持续的市场预期，并战略性地让多个周期的奖励在同一天触发，形成"**超级分红日**"：

- **第30天**: 6天池 + 30天池 同时分红
- **第90天**: 6天池 + 30天池 + 90天池 同时分红
- **第360天**: 6天池 + 30天池 + 90天池 + 360天池 同时分红
- **第720天**: 🎉 **超级大满贯** - 全部5个池子（6+30+90+360+720天）同时分红！

这些同步的分红事件创造了巨额奖励日，激励长期承诺。

### 6.2. 获得分红权
分红权数量取决于质押时的**分红权汇率**和奖励。

- **\`LongerPaysMore\` (时长加成)**: 质押时间越长，分红权越多。对于1500天或更长质押，最高可获得 **+206%显著奖励**

- **\`BiggerBenefit\` (大额奖励)**: 为鼓励用户进行大额单次质押，避免过度拆分成小批次，协议提供基于质押金额的额外APY奖励：
    - **100-999 SLEEPING**: +0% 额外APY
    - **1,000-4,999 SLEEPING**: +1% 额外APY  
    - **5,000-9,999 SLEEPING**: +2% 额外APY
    - **10,000-49,999 SLEEPING**: +3% 额外APY
    - **50,000-99,999 SLEEPING**: +4% 额外APY
    - **100,000-499,999 SLEEPING**: +5% 额外APY
    - **500,000+ SLEEPING**: +6% 额外APY (最高)

**BiggerBenefit计算规则**：
- 每个Access Pass NFT最多记录6个独立存款
- 卡内BiggerBenefit = MAX(单次存款最高等级, 卡内总额等级)
- 同一张卡内的所有存款都享受该卡的最高BiggerBenefit等级

**完整APY计算公式**：
<pre><code>总APY = 基础APY(100%) + 实际天数奖励(最高206%) + BiggerBenefit(最高6%) + 无限模式奖励(366%，如适用)

普通模式最高：100% + 206% + 6% = 312%
无限模式最高：100% + 366% + 6% = 472%</code></pre>

### 6.3. 质押惩罚机制
- **最低质押期**: 26天
- **提前结束质押**: 未满50%时不允许结束。超过55%但未到期时结束，**55%本金被惩罚性罚没，其中49%直接销毁，6%分配给奖励池**，您将收回剩余45%的本金
- **延迟结束质押**: 到期后有**6天宽限期**。之后每天罚没本金**1.45%**。累计罚金超过本金**50%**后可被清算

### 6.4. 多次质押的取出机制
为了平衡灵活性和系统稳定性，协议对多次质押的取出实行差异化管理：

**未到期质押（早期取出）**：
- 只能选择整张Access Pass全部取出
- 适用55%的统一惩罚率
- 无法进行部分取出操作

**已到期质押（成熟取出）**：
- 可以选择具体的存款记录进行部分取出
- 在6天宽限期内无惩罚
- 超过宽限期后按每日1.45%累计罚没
- 每个存款记录独立计算罚没时间

**设计优势**：
- 鼓励用户坚持到期，享受完整收益
- 到期后提供灵活的资金管理选择
- 防止系统性的早期退出风险
- 简化合约逻辑，降低gas成本

## 7. 核心创新：可交易的金融 NFT 生态

Sleep Protocol 引入了两项革命性创新，将传统 DeFi 的"死钱"转化为"活资产"，为用户创造了前所未有的资本效率和流动性。

### 7.1. 铸币权益 NFT 化 (Minting Position NFT)

**创新机制**：
当用户参与铸币时，协议不会简单地记录一个"账本条目"，而是为用户铸造一个 **Minting Position NFT**。这个 NFT 完整地封装了用户的整个铸币仓位，包括：
- 铸币期限和到期时间
- 铸币数量和全局排名
- 预期奖励计算参数
- 动态的可视化状态（活跃/成熟/惩罚/已清算）

**突破性价值**：
- **即时流动性**：用户无需等待铸币期限结束即可变现。一个承诺锁定 3 个月的铸币仓位，可以在 OpenSea 等 NFT 市场上立即出售给愿意等待的买家
- **风险转移**：如果用户预期协议发展不如预期，可以将风险转移给更看好项目的投资者
- **投资组合**：专业投资者可以构建多样化的"铸币期限组合"，通过购买不同到期时间的 Minting Position NFT 来分散风险
- **价格发现**：二级市场会自动为不同期限、不同排名的铸币仓位进行定价，形成完整的收益率曲线

### 7.2. 质押权益 NFT 化 (Access Pass NFT)

**创新机制**：
Sleep Protocol 的质押系统摒弃了传统的"资金池"模式，转而采用 **Access Pass NFT** 作为质押凭证。这个 NFT 不仅仅是一张"收据"，更是一个功能完整的 **数字储蓄卡**：

- **真正的 NFT 所有权 (ERC-6551)**：每个 Access Pass NFT 都基于 ERC-6551 代币绑定账户标准，意味着每个 NFT 都拥有自己独立的智能合约钱包地址。用户的 $SLEEPING 代币真正属于 NFT 本身，而非存储在中心化合约中。

  **为什么选择 ERC-6551 而非 ERC-3525？**
  虽然 ERC-3525（半同质化代币）允许可分割的金融资产（如可拆分合并的债券），但 ERC-6551 为我们的用例提供了远超的功能：
  - **完整钱包能力**：每个 NFT 都是完整的智能合约钱包，不仅仅是可分割资产
  - **通用资产持有**：可持有任何代币类型（ERC-20、ERC-721、ETH）无限制
  - **DeFi 可组合性**：直接与任何 DeFi 协议交互（借贷、DEX、流动性挖矿）
  - **未来扩展设计**：新金融产品的无限扩展潜力
  - **真正自托管**：用户通过其 NFT 保持对资产的完全控制
- **分红权记录**：\`StakingRewards\` 合约作为纯粹的"账本"，记录每个 NFT 对应的质押数量和分红权，而实际代币始终在 NFT 的直接控制之下。
- **个性化设计**：每个 Access Pass 都支持自定义 SVG 设计，让用户可以创造独一无二的数字身份标识。
- **实时数据展示**：NFT 图像动态显示以下实时信息：
    - 持有者钱包地址
    - 卡内总质押数量
    - 存款记录数量 (X/6)
    - 当前BiggerBenefit等级 (+X%)
    - 天数APY加成等级 (+X%)
    - 可领取奖励金额
    - 卡片等级状态 (青铜/白银/黄金/钻石)
    - 无限质押标识 (如适用)

**突破性价值**：
- **革命性安全**：每个 NFT 通过其专属的智能合约钱包真正拥有质押资产。这是自托管的终极形式——您的代币属于您的 NFT，而非任何协议合约。
- **完全流动性**：长期质押仓位可以在 NFT 市场上自由买卖，买家接手质押仓位的同时也继承其累积的分红权。NFT 的钱包地址随所有权一起转移。
- **无限可组合性**：每个 Access Pass 可以持有任意资产并与任何 DeFi 协议交互。您的 NFT 可以在整个生态系统中自主地质押、借贷、交易或挖矿。
- **社交属性**：自定义 SVG 功能让质押从纯粹的金融行为升华为个性表达和社交展示。
- **组合投资**：投资者可以购买多个不同质押时长、不同分红权比例的 Access Pass，构建个性化的收益组合。

### 7.3. 生态协同效应

这两项创新共同创造了一个**前所未有的可交易金融生态**：

**统一二级市场**：
- 铸币权、质押权、分红权全部在同一个 NFT 市场交易
- 用户可以用熟悉的 OpenSea、Blur 等平台管理复杂的 DeFi 仓位
- 降低了 DeFi 参与门槛，扩大了潜在用户群体

**价值重新分配**：
- 风险厌恶者可以将长期仓位出售给风险偏好者
- 流动性需求者可以立即变现，流动性提供者获得折价收购机会
- 形成了一个高效的风险和收益重新分配市场

**创新金融产品**：
- 基于 NFT 的抵押借贷：用 Access Pass 作为抵押品借款
- 期限套利：在不同期限的仓位之间进行套利交易
- 收益农场：专门收购即将到期的高收益 NFT

**结论**：Sleep Protocol 不仅是一个代币项目，更是一个开创性的"**可交易金融权益基础设施**"，为整个 DeFi 行业探索了资本效率最大化的全新方向。

## 8. 技术架构：为什么我们选择 ERC-6551

### 8.1. NFT 标准对比

**ERC-721 (传统 NFT)**
- ✅ 独特数字资产
- ❌ 无法持有其他资产
- ❌ DeFi 交互有限
- ❌ 静态价值主张

**ERC-3525 (半同质化代币)**
- ✅ 可分割的金融资产
- ✅ 可表示分数所有权
- ❌ 仅限于基于数量的操作
- ❌ 无法持有多样化资产类型
- ❌ 可组合性受限

**ERC-6551 (代币绑定账户)**
- ✅ 每个 NFT 都是完整的智能合约钱包
- ✅ 可持有无限资产类型
- ✅ 完全的 DeFi 协议兼容性
- ✅ 无限可组合性和扩展性
- ✅ 真正的自托管模型

### 8.2. 实际使用场景对比

**场景 1：传统质押**
- 用户存入代币 → 中心化资金池
- 风险：协议控制所有资金
- 流动性：零（锁定直至取消质押）

**场景 2：ERC-3525 方案**
- 用户获得可分割的质押 NFT
- 可拆分/合并质押仓位
- 风险：仍是协议控制的资金
- 流动性：仅限于 NFT 市场

**场景 3：我们的 ERC-6551 解决方案**
- 用户的 NFT 真正拥有质押代币
- NFT 可同时参与其他 DeFi 协议
- 风险：用户保持完全控制
- 流动性：完整二级市场 + DeFi 交互

### 8.3. 未来扩展可能性

使用 ERC-6551，每个 Access Pass NFT 可以：
- **流动性挖矿**：自动将奖励质押到其他协议
- **杠杆交易**：将质押资产作为借贷抵押品
- **跨链桥接**：在多个区块链上持有资产
- **DAO 参与**：在多个治理协议中投票
- **自动化策略**：自主执行复杂的 DeFi 策略

这种可组合性水平是传统质押或 ERC-3525 模型无法实现的。

## 快速开始指南

### 准备工作
开始之前，请确保您拥有：
- **Web3 钱包**: MetaMask、OKX 钱包或任何支持 WalletConnect 的钱包
- **OKB Gas 费**: 足够的 OKB 用于铸币费用和 gas
- **基础 DeFi 知识**: 了解质押、铸币和智能合约风险

### 核心组件

#### 质押合约
管理用户存款和提款，具有以下特性：
- 安全的资金托管
- 自动奖励计算
- 灵活的质押期限
- 紧急提款机制

#### 奖励分配器
基于以下因素计算和分配奖励：
- 质押持续时间
- 质押金额
- 当前年化收益率
- 奖励倍数

#### 治理模块
通过以下方式处理协议升级和决策：
- 提案创建和投票
- 时间锁定升级
- 多签名要求
- 社区参与

### 安全特性

1. **多签名要求** - 关键操作需要多重签名
2. **时间锁定升级** - 防止恶意更改
3. **紧急暂停机制** - 应对危机情况
4. **全面测试套件** - 100% 代码覆盖率

## 质押机制

Sleep Protocol 提供多种质押选项，旨在适应不同的风险偏好和投资策略。

### 标准质押

- **锁定期**: 30-365 天
- **奖励**: OKB + SLEEP 代币
- **年化收益率**: 8-25%（根据锁定期变化）
- **提前退出**: 适用罚金（1-5%）

#### 奖励计算

\`\`\`
基础奖励 = (质押金额 × 年化收益率 × 时间) / 365
最终奖励 = 基础奖励 × 倍数 × 奖金
\`\`\`

#### 倍数系统

- **锁定期奖金**: 1.0x - 2.5x
- **治理参与**: +0.2x
- **早期采用者奖金**: +0.5x（前 6 个月）

### 流动性质押

为需要灵活性的用户提供：

- **锁定期**: 无
- **奖励**: 较低利率但即时流动性
- **年化收益率**: 3-8%
- **提前退出**: 无罚金

### 治理质押

为活跃参与者提供增强奖励：

- **锁定期**: 最少 90 天
- **奖励**: 增强倍数高达 3.0x
- **投票权**: 与质押金额 1:1 比例
- **福利**: 协议费用折扣高达 50%

## 代币经济学

Sleep Protocol 实施了一个复杂的双代币经济模型，旨在实现可持续增长和价值累积。

### SLEEP 代币

- **总供应量**: 100,000,000 SLEEP
- **初始分配**:
  - 60% 社区奖励和激励
  - 20% 团队（4年归属期）
  - 20% 国库和开发
- **用途**: 治理、质押、费用折扣
- **通胀**: 第2年后每年上限2%

### OKB 集成

- **主要奖励代币**: 来自 OKX 生态系统的 OKB
- **奖励池**: 由协议费用和合作伙伴关系资助
- **跨链支持**: 多链 OKB 分配
- **流动性**: 深度 OKX 交易所集成

### 费用结构

#### 质押费用
- **存款费用**: 所有存款的 0.1%
- **绩效费用**: 获得奖励的 10%
- **提前退出费用**: 1-5%（随时间线性递减）

#### 治理费用
- **提案费用**: 国库的 0.05%，防止垃圾提案
- **执行费用**: 成功提案的 0.01%

### 收入分配

我们的可持续费用模型按以下方式分配收入：

1. **50% → 质押者奖励** - 直接奖励给参与者
2. **30% → 协议国库** - 长期可持续性
3. **15% → 开发基金** - 持续改进
4. **5% → 保险池** - 风险缓解

## API 参考

Sleep Protocol 为在协议之上构建的开发者提供全面的 API。

### 智能合约接口

#### SleepStaking.sol

\`\`\`solidity
function stake(uint256 amount, uint256 duration) external;
function unstake(uint256 stakeId) external;
function claimRewards(uint256 stakeId) external;
function getStakeInfo(address user, uint256 stakeId) external view returns (StakeInfo);
\`\`\`

#### RewardDistributor.sol

\`\`\`solidity
function distributeRewards() external;
function calculateReward(address user, uint256 stakeId) external view returns (uint264);
function setRewardRate(uint256 newRate) external onlyOwner;
\`\`\`

#### Governance.sol

\`\`\`solidity
function propose(string memory description, address[] memory targets, bytes[] memory calldatas) external;
function vote(uint256 proposalId, bool support) external;
function execute(uint256 proposalId) external;
\`\`\`

### Web3 集成

#### React Hooks

我们提供自定义 React hooks 以便于集成：

- **useStaking()** - 质押操作和状态管理
- **useRewards()** - 奖励跟踪和领取
- **useGovernance()** - 治理参与

#### TypeScript 类型

完整的类型定义包括：
- StakeInfo, RewardData, ProposalData
- 事件类型和错误处理
- 合约交互工具

### REST API 端点

#### 用户数据
- \`GET /api/stakes/{address}\` - 用户质押和历史
- \`GET /api/rewards/{address}\` - 奖励历史和待领取奖励
- \`GET /api/profile/{address}\` - 完整用户档案

#### 协议数据
- \`GET /api/stats\` - 协议统计和指标
- \`GET /api/proposals\` - 治理提案和投票
- \`GET /api/apy\` - 当前年化收益率和预测

### 速率限制

- **公共 API**: 每 IP 每分钟 100 次请求
- **已认证**: 每 API 密钥每分钟 1000 次请求
- **WebSocket**: 每 IP 10 个并发连接

## 使用指南

### Sleep Protocol 入门指南

本综合指南将引导您完成使用 Sleep Protocol 的每个步骤，从初始设置到高级功能。

#### 准备工作

开始之前，请确保您拥有：
- **Web3 钱包**: MetaMask、OKX 钱包或任何支持 WalletConnect 的钱包
- **ETH Gas 费**: 足够的以太坊用于交易费用
- **SLEEP 代币**: 可在支持的 DEX 上获得或通过协议活动赚取
- **基础 DeFi 知识**: 了解质押、年化收益率和智能合约风险

#### 第一步：钱包设置

1. **安装钱包扩展**
   - 从 metamask.io 下载 MetaMask
   - 或从 okx.com/web3 安装 OKX 钱包
   - 创建新钱包或导入现有助记词

2. **网络配置**
   - 确保您连接到以太坊主网
   - 如使用 Layer 2 解决方案，添加自定义网络
   - 验证网络设置与我们支持的链匹配

3. **安全最佳实践**
   - 永远不要分享您的助记词或私钥
   - 大额资金使用硬件钱包
   - 启用所有可用的安全功能

#### 第二步：获取 SLEEP 代币

1. **购买选项**
   - **Uniswap**: 用 ETH 或其他代币兑换 SLEEP
   - **OKX DEX**: 深度流动性的直接交易
   - **1inch**: 跨 DEX 的最佳价格聚合

2. **代币合约验证**
   - 始终验证官方 SLEEP 代币合约地址
   - 在进行任何交易前在 Etherscan 上检查
   - 小心假冒或诈骗代币

#### 第三步：您的第一次质押

1. **连接到 Sleep Protocol**
   - 访问官方 Sleep Protocol dApp
   - 点击右上角的"连接钱包"
   - 批准连接请求

2. **代币批准**
   - 如果提示，点击"批准 SLEEP"
   - 设置批准金额（建议无限制以便使用）
   - 确认批准交易

3. **选择质押选项**
   - **标准质押**: 更高奖励，锁定期
   - **流动性质押**: 较低奖励，即时流动性
   - **治理质押**: 最大奖励，投票权

4. **执行质押**
   - 输入所需金额（最少 1 SLEEP）
   - 选择锁定期（标准质押 30-365 天）
   - 仔细检查所有详细信息
   - 确认交易并支付 gas 费用

#### 第四步：管理您的质押

1. **仪表板概览**
   - 查看所有活跃质押
   - 监控奖励累积
   - 跟踪锁定期倒计时

2. **领取奖励**
   - 奖励自动累积
   - 点击"领取"提取到钱包
   - 考虑 gas 成本与奖励金额的关系

3. **取消质押流程**
   - 仅在锁定期到期后可用
   - 提前取消质押会产生罚金
   - 流程可能需要 1-2 个区块完成

#### 第五步：高级功能

1. **治理参与**
   - 在治理池中质押以获得投票权
   - 参与协议决策
   - 因积极参与获得奖励加成

2. **奖励优化**
   - 通过重新质押复投奖励
   - 为最大效率计时入场
   - 监控 APY 变化并调整策略

3. **多链操作**
   - 在支持的链之间桥接代币
   - 优化较低的 gas 费用
   - 在网络间保持安全

### 常见问题故障排除

#### 交易失败
- **Gas 不足**: 增加 gas 限制或价格
- **代币批准**: 确保 SLEEP 已批准用于质押
- **网络问题**: 检查连接并重试

#### 奖励缺失
- **同步延迟**: 等待 1-2 个区块更新
- **浏览器缓存**: 清除缓存并刷新
- **网络切换**: 确保选择正确的网络

#### 钱包连接问题
- **浏览器冲突**: 尝试无痕模式
- **扩展更新**: 更新钱包扩展
- **网络重置**: 在钱包中重置网络设置

## 免责声明

### 重要法律和金融免责声明

**使用 SLEEP PROTOCOL 前请仔细阅读**

Sleep Protocol 是一个实验性的去中心化金融（DeFi）协议。通过使用 Sleep Protocol，您确认并接受以下风险和免责声明：

#### 金融风险免责声明

1. **资金完全损失**
   - 加密货币投资具有极高风险
   - 您可能损失部分或全部存入资金
   - 过往表现不保证未来结果
   - 年化收益率为估算值，可能发生变化

2. **市场波动性**
   - 加密货币价格高度波动
   - 代币价值可能剧烈波动
   - 奖励可能无法补偿代币贬值
   - 市场条件影响所有 DeFi 协议

3. **无常损失**
   - 质押不能防止代币价格下跌
   - 锁定资金的机会成本
   - 通胀可能侵蚀奖励的实际价值

#### 技术风险免责声明

1. **智能合约风险**
   - 智能合约可能包含错误或漏洞
   - 代码审计不保证完全安全
   - 利用或黑客攻击可能导致资金损失
   - 协议升级可能引入新风险

2. **区块链风险**
   - 网络拥堵可能延迟交易
   - Gas 费用可能不可预测且昂贵
   - 区块链重组可能影响交易
   - 网络升级可能影响协议功能

3. **第三方风险**
   - 依赖外部预言机和数据源
   - 与其他协议的集成风险
   - 钱包软件漏洞
   - 交易所和桥接风险

#### 监管风险免责声明

1. **法律不确定性**
   - DeFi 法规快速发展
   - 未来法律可能限制或禁止使用
   - 税务影响因司法管辖区而异
   - 合规要求可能发生变化

2. **地理限制**
   - 服务可能不在所有地区提供
   - 用户有责任遵守当地法律
   - 适用制裁和限制司法管辖区
   - 使用 VPN 不能规避法律限制

#### 运营风险免责声明

1. **协议治理**
   - 治理决策可能对用户产生负面影响
   - 投票结果不保证有利
   - 协议变更可能改变风险/回报概况
   - 紧急行动可能限制用户访问

2. **流动性风险**
   - 取消质押可能被延迟或限制
   - 紧急暂停机制可能阻止提款
   - 市场条件可能影响退出流动性
   - 锁定期严格执行

#### 非投资建议

1. **仅供教育目的**
   - 本文档仅供信息目的
   - 不构成财务、投资或法律建议
   - 投资前咨询合格专业人士
   - 做出独立投资决策

2. **无保证**
   - 不保证利润或回报
   - 不保证协议功能
   - 不保证服务可用性
   - 不保证支持响应

#### 用户责任

1. **尽职调查**
   - 研究并了解所有风险
   - 独立验证所有信息
   - 最初用小额测试
   - 定期监控头寸

2. **安全实践**
   - 保护您的私钥和助记词
   - 使用信誉良好的钱包和安全实践
   - 验证所有合约地址
   - 警惕钓鱼攻击

3. **法律合规**
   - 遵守所有适用法律
   - 按要求报告税务
   - 了解当地法规
   - 如不确定请寻求法律建议

#### 责任限制

1. **无保证**
   - 协议按"原样"提供，不提供保证
   - 不保证不间断服务
   - 不保证适用于特定目的
   - 明确拒绝所有保证

2. **损害限制**
   - 开发者不对任何损害承担责任
   - 用户承担参与的所有风险
   - 最大责任限于投资金额
   - 明确排除后果性损害

#### 联系和支持

1. **社区支持**
   - Discord 社区提供同伴协助
   - GitHub 用于技术问题和错误
   - 文档提供协议信息
   - 不保证官方客户支持

2. **紧急程序**
   - 监控官方渠道公告
   - 如有公告请遵循紧急程序
   - 治理可能实施紧急措施
   - 用户有责任保持知情

**通过使用 SLEEP PROTOCOL，您确认已阅读、理解并接受本免责声明的所有条款。如果您不接受这些条款，请勿使用该协议。**

**本免责声明最后更新于 [日期]，可能随时修改，恕不另行通知。**

## 常见问题

### 一般问题

#### 什么是 Sleep Protocol？

Sleep Protocol 是一个去中心化金融（DeFi）协议，允许用户质押代币并通过创新的基于时间的机制和动态费用结构赚取奖励。

#### 如何开始使用 Sleep Protocol？

1. **连接钱包**: 使用 MetaMask、OKX 钱包或任何 Web3 兼容钱包
2. **获取 SLEEP 代币**: 在支持的交易所购买或通过协议活动赚取
3. **选择质押选项**: 从标准、流动性或治理质押中选择
4. **质押并赚取**: 确认交易并立即开始赚取奖励

#### 支持哪些钱包？

我们支持所有主要的 Web3 钱包，包括：
- MetaMask
- OKX 钱包
- WalletConnect
- Coinbase 钱包
- Trust 钱包

### 质押问题

#### 最小质押金额是多少？

最小质押金额是 **1 SLEEP 代币**，以确保所有用户都能参与。

#### 我可以多次质押吗？

可以！每次质押都会单独跟踪，具有自己的条款、奖励和解锁计划。您可以拥有无限个活跃质押。

#### 如果我提前取消质押会怎样？

提前取消质押会产生罚金费用：
- 质押后立即开始为 5%
- 在锁定期内线性递减到 1%
- 在锁定期结束时达到 0%

#### 奖励多久分配一次？

- **累积**: 奖励实时持续累积
- **分配**: 每周自动分配到您的钱包
- **手动领取**: 可随时通过仪表板领取

### 技术问题

#### 协议经过审计了吗？

是的，Sleep Protocol 已经过全面的安全审计：
- **Certik** - 智能合约安全审计
- **Quantstamp** - 经济模型审查
- **Trail of Bits** - 形式化验证

所有审计报告都在我们的网站上公开提供。

#### 支持哪些区块链网络？

- **主要**: 以太坊主网
- **计划中**: Arbitrum、Optimism、Polygon
- **跨链**: 多链操作的桥接功能

#### 如何查看智能合约代码？

所有合约都已验证且开源：
- **Etherscan**: 验证的合约代码和交互
- **GitHub**: 完整的源代码和文档
- **文档**: 详细的技术规范

### 故障排除

#### 我的交易失败了，应该怎么办？

常见解决方案：
1. **检查 Gas**: 确保有足够的 ETH 支付 gas 费用
2. **代币批准**: 验证 SLEEP 代币已批准用于质押
3. **网络**: 确认您连接到正确的网络
4. **金额**: 验证质押金额满足最小要求

#### 我看不到我的奖励

- **等待时间**: 奖励可能需要 1-2 个区块才能显示（2-4 分钟）
- **刷新**: 尝试刷新页面或重新连接钱包
- **网络**: 确保您在正确的网络上
- **联系**: 加入我们的 Discord 获取实时支持

#### 如何联系支持？

- **Discord**: 加入我们的社区服务器获取即时帮助
- **邮件**: support@sleepprotocol.io 详细咨询
- **文档**: 首先查看此 FAQ 和文档
- **GitHub**: 报告技术问题和错误`
  })

  const menus = ['File', 'Edit', 'View', 'Insert', 'Format', 'Help']

  const isDevWallet = address?.toLowerCase() === DEV_WALLET_ADDRESS.toLowerCase()

  // 解析markdown内容生成树形目录
  const tocEntries = useMemo((): TocEntry[] => {
    const content = docContent[currentLanguage]
    const lines = content.split('\n')
    const flatEntries: TocEntry[] = []
    
    // 首先生成扁平列表
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
        
        flatEntries.push({
          id: `heading-${id}-${index}`,
          title,
          level,
          line: index,
          children: [],
          parent: undefined
        })
      }
    })
    
    // 构建树形结构
    const rootEntries: TocEntry[] = []
    const stack: TocEntry[] = []
    
    flatEntries.forEach(entry => {
      // 找到合适的父级
      while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
        stack.pop()
      }
      
      if (stack.length === 0) {
        // 这是根级别的项目
        rootEntries.push(entry)
      } else {
        // 这是子项目
        const parent = stack[stack.length - 1]
        parent.children.push(entry)
        entry.parent = parent
      }
      
      stack.push(entry)
    })
    
    return rootEntries
  }, [docContent, currentLanguage])

  // 自动展开主要章节
  useEffect(() => {
    if (tocEntries.length > 0) {
      const defaultExpanded = new Set<string>()
      tocEntries.forEach(entry => {
        if (entry.level <= 2 && entry.children.length > 0) {
          defaultExpanded.add(entry.id)
        }
      })
      setExpandedSections(defaultExpanded)
    }
  }, [tocEntries])


  // 使用 react-katex 渲染数学公式的组件
  const MathFormula = ({ children, block = false }: { children: string; block?: boolean }) => {
    try {
      if (block) {
        return (
          <div style={{ margin: '20px 0', textAlign: 'center' }}>
            <BlockMath math={children} />
          </div>
        )
      } else {
        return <InlineMath math={children} />
      }
    } catch (error) {
      console.warn('KaTeX渲染错误:', error)
      return <span style={{ color: 'red' }}>[公式错误: {children}]</span>
    }
  }

  // 渲染包含数学公式的 Markdown 内容（React 组件版本）
  const renderMarkdownWithMath = (content: string) => {
    // 首先分割块级数学公式
    const parts = content.split(/(\$\$[^$]*?\$\$)/g)
    
    return parts.map((part, index) => {
      // 检查是否是块级数学公式
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const mathContent = part.slice(2, -2).trim()
        return <MathFormula key={index} block={true}>{mathContent}</MathFormula>
      }
      
      // 处理普通文本（可能包含行内数学公式）
      const inlineParts = part.split(/(\$[^$\n]+?\$)/g)
      
      return inlineParts.map((inlinePart, inlineIndex) => {
        if (inlinePart.startsWith('$') && inlinePart.endsWith('$')) {
          const mathContent = inlinePart.slice(1, -1).trim()
          return <MathFormula key={`${index}-${inlineIndex}`} block={false}>{mathContent}</MathFormula>
        }
        
        // 渲染普通 Markdown
        return (
          <div 
            key={`${index}-${inlineIndex}`}
            dangerouslySetInnerHTML={{ 
              __html: renderMarkdown(inlinePart)
            }}
          />
        )
      })
    }).flat()
  }

  // 渲染markdown内容
  const renderMarkdown = (content: string): string => {
    const lines = content.split('\n')
    let lineIndex = 0
    
    return content
      // 标题
      .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
        const level = hashes.length
        const id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
        
        // 找到这一行在原始内容中的位置
        const currentLineIndex = lines.findIndex(line => line === match)
        const uniqueId = `${id}-${currentLineIndex >= 0 ? currentLineIndex : lineIndex++}`
        
        return `<h${level} id="${id}">${title}</h${level}>`
      })
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 行内代码 (排除数学公式)
      .replace(/`([^`$]+)`/g, '<code>$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // 引用
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      // 分隔线
      .replace(/^---$/gm, '<hr>')
      // 列表项
      .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
      // 段落
      .replace(/\n\n/g, '</p><p>')
      // 换行
      .replace(/\n/g, '<br>')
  }

  const handleEdit = () => {
    if (isDevWallet) {
      setIsEditing(!isEditing)
    }
  }

  const handleSave = () => {
    setIsEditing(false)
    // TODO: 实现实际保存功能
  }

  const handleContentChange = (newContent: string) => {
    setDocContent(prev => ({
      ...prev,
      [currentLanguage]: newContent
    }))
  }

  // 编辑器工具栏功能
  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = textarea.value.substring(start, end)
      const newText = before + selectedText + after
      
      const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end)
      
      handleContentChange(newValue)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
      }, 0)
    }
  }

  const formatText = (type: string) => {
    switch (type) {
      case 'h1': insertText('# '); break
      case 'h2': insertText('## '); break
      case 'h3': insertText('### '); break
      case 'h4': insertText('#### '); break
      case 'h5': insertText('##### '); break
      case 'bold': insertText('**', '**'); break
      case 'italic': insertText('*', '*'); break
      case 'code': insertText('`', '`'); break
      case 'codeblock': insertText('```\n', '\n```'); break
      case 'list': insertText('- '); break
      case 'link': insertText('[', '](https://)'); break
      case 'quote': insertText('> '); break
      case 'line': insertText('\n---\n'); break
      case 'math-inline': insertText('$', '$'); break
      case 'math-block': insertText('\n$$\n', '\n$$\n'); break
    }
  }

  // 切换展开/折叠状态
  const toggleExpanded = (entryId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  // 跳转到指定标题
  const jumpToHeading = (headingId: string) => {
    setActiveHeading(headingId)
    
    // 从 heading-id-123 格式中提取原始id
    const cleanId = headingId.replace(/^heading-/, '').replace(/-\d+$/, '')
    
    // 首先尝试直接找到元素
    let element = document.getElementById(cleanId)
    
    // 如果没找到，尝试找到包含这个文本的标题
    if (!element) {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i]
        if (heading.id === cleanId) {
          element = heading as HTMLElement
          break
        }
      }
    }
    
    if (element) {
      // 滚动到元素位置，留出一些顶部空间
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
      
      // 稍微调整滚动位置，避免被固定元素遮挡
      setTimeout(() => {
        const container = element?.closest('.win98-scroll-area') || document.querySelector('.content-scroll-area')
        if (container && element) {
          const containerRect = container.getBoundingClientRect()
          const elementRect = element.getBoundingClientRect()
          const offset = elementRect.top - containerRect.top - 20 // 20px的顶部间距
          container.scrollTop += offset
        }
      }, 100)
    }
  }

  // 渲染目录树
  const renderTocTree = (entries: TocEntry[]): React.ReactNode => {
    return entries.map(entry => {
      const isExpanded = expandedSections.has(entry.id)
      const hasChildren = entry.children.length > 0
      
      return (
        <div key={entry.id}>
          <TocItem
            level={entry.level}
            active={activeHeading === entry.id}
            hasChildren={hasChildren}
            onClick={() => jumpToHeading(entry.id)}
          >
            <TocToggle
              expanded={isExpanded}
              hasChildren={hasChildren}
              onClick={(e) => toggleExpanded(entry.id, e)}
            />
            <TocTitle>{entry.title}</TocTitle>
          </TocItem>
          
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: '8px' }}>
              {renderTocTree(entry.children)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <DocsStyled>
      <DocsMenu>
        {menus.map((m) => (
          <MenuBarEntry key={m} label={m} />
        ))}
      </DocsMenu>
      
      <DocsContainer>
        {/* Table of Contents */}
        <TableOfContents>
          <h3 style={{ 
            color: '#000080', 
            marginBottom: '16px', 
            borderBottom: '2px solid #808080', 
            paddingBottom: '8px'
          }}>
            {t('docs.tableOfContents', '自动目录')}
          </h3>
          
          {/* Language Switch */}
          <LanguageSwitch>
            <LanguageButton
              active={currentLanguage === 'en'}
              onClick={() => setCurrentLanguage('en')}
            >
              English
            </LanguageButton>
            <LanguageButton
              active={currentLanguage === 'zh'}
              onClick={() => setCurrentLanguage('zh')}
            >
              中文
            </LanguageButton>
          </LanguageSwitch>
          
          {/* Auto-generated TOC */}
          <TocScrollArea>
            {renderTocTree(tocEntries)}
          </TocScrollArea>
        </TableOfContents>

        {/* Content Area */}
        <ContentArea>
          {isDevWallet && (
            <>
              {isEditing ? (
                <SaveButton onClick={handleSave}>
                  {t('docs.save', 'Save')}
                </SaveButton>
              ) : (
                <EditButton onClick={handleEdit}>
                  {t('docs.edit', 'Edit')}
                </EditButton>
              )}
            </>
          )}
          
          {isEditing ? (
            <>
              <EditorToolbar>
                <ToolbarButton onClick={() => formatText('h1')}>
                  <div className="inner-button">H1</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('h2')}>
                  <div className="inner-button">H2</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('h3')}>
                  <div className="inner-button">H3</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('h4')}>
                  <div className="inner-button">H4</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('h5')}>
                  <div className="inner-button">H5</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('bold')}>
                  <div className="inner-button">Bold</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('italic')}>
                  <div className="inner-button">Italic</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('code')}>
                  <div className="inner-button">Code</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('codeblock')}>
                  <div className="inner-button">Block</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('list')}>
                  <div className="inner-button">List</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('link')}>
                  <div className="inner-button">Link</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('quote')}>
                  <div className="inner-button">Quote</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('line')}>
                  <div className="inner-button">Line</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('math-inline')}>
                  <div className="inner-button">$x$</div>
                </ToolbarButton>
                <ToolbarButton onClick={() => formatText('math-block')}>
                  <div className="inner-button">$$</div>
                </ToolbarButton>
              </EditorToolbar>
              
              <EnhancedTextarea
                value={docContent[currentLanguage]}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="# 输入您的文档标题

使用 Markdown 语法编写文档，目录将自动生成..."
              />
            </>
          ) : (
            <ContentScrollArea className="content-scroll-area">
              <RenderedContent>
                {renderMarkdownWithMath(docContent[currentLanguage])}
              </RenderedContent>
            </ContentScrollArea>
          )}
          
          {isDevWallet && (
            <div style={{ 
              marginTop: '16px', 
              padding: '8px', 
              background: '#ffffcc', 
              border: '1px solid #cccc00',
              fontSize: '12px'
            }}>
              {t('docs.devMode', `Dev模式：可编辑文档 (${currentLanguage.toUpperCase()}) - 目录自动生成`)}
            </div>
          )}
        </ContentArea>
      </DocsContainer>
    </DocsStyled>
  )
}

export default Docs