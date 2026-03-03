import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useSleepContext } from '~/contexts/SleepContext';
import Container from '~/components/containers/Container';
import CardContainer from '~/components/containers/CardContainer';
import { useAccount } from 'wagmi';
import { StakeDashboard } from '~/components/stake/StakeDashboard';
import { UnstakedDashboard } from '~/components/stake/UnstakedDashboard';
import { ConnectWalletInfo } from '~/components/stake/ConnectWalletInfo';
import { formatUnits } from 'viem';
import toast from 'react-hot-toast';

// ATM Screen States
type ATMScreen = 'main' | 'card-reading' | 'card-selection' | 'card-operations' | 'deposit' | 'withdraw' | 'claim-rewards' | 'connect-wallet' | 'no-cards';

// Mock Access Pass NFT structure (until we have real contract integration)
interface AccessPassNFT {
  tokenId: number;
  stakedAmount: number;
  claimableOKB: number;
  claimableSLEEP: number;
  design?: any;
}

const StakePage: NextPage = () => {
  const { t } = useTranslation('common');
  const { address } = useAccount();
  const { rewardPool, sleepRewardPool, totalStaked, sleepBalance, refetchGlobals } = useSleepContext();

  // ATM State Management
  const [currentScreen, setCurrentScreen] = useState<ATMScreen>('main');
  const [selectedCard, setSelectedCard] = useState<AccessPassNFT | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock user's Access Pass NFTs (until we have real contract integration)
  const [userAccessPasses] = useState<AccessPassNFT[]>([
    {
      tokenId: 1,
      stakedAmount: 12345.67,
      claimableOKB: 88.88,
      claimableSLEEP: 456.78
    },
    {
      tokenId: 2,
      stakedAmount: 5000.00,
      claimableOKB: 25.50,
      claimableSLEEP: 150.25
    },
    {
      tokenId: 3,
      stakedAmount: 0,
      claimableOKB: 0,
      claimableSLEEP: 0
    }
  ]);

  useEffect(() => {
    refetchGlobals?.();
  }, [refetchGlobals]);

  // Determine initial screen based on wallet connection
  useEffect(() => {
    if (!address) {
      setCurrentScreen('connect-wallet');
    } else {
      setCurrentScreen('main');
    }
  }, [address]);

  // Mock staking status for XP ATM demo
  const userHasStaked = userAccessPasses.some(nft => nft.stakedAmount > 0);

  // Keypad input handler
  const handleKeypadInput = (value: string) => {
    if (value === 'CLEAR') {
      setInputAmount('');
    } else if (value === 'BACK') {
      setInputAmount(prev => prev.slice(0, -1));
    } else if (value === 'ENTER') {
      handleEnterPress();
    } else if (value === 'CANCEL') {
      setCurrentScreen('card-operations');
      setInputAmount('');
    } else if (value === '.') {
      if (!inputAmount.includes('.')) {
        setInputAmount(prev => prev + '.');
      }
    } else {
      // Number input
      if (inputAmount.length < 12) { // Limit input length
        setInputAmount(prev => prev + value);
      }
    }
  };

  const handleEnterPress = () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    switch (currentScreen) {
      case 'deposit':
        handleDeposit();
        break;
      case 'withdraw':
        handleWithdraw();
        break;
      default:
        break;
    }
  };

  const handleDeposit = async () => {
    if (!selectedCard) return;
    setIsProcessing(true);
    try {
      // Mock call to SleepAccessPass.stake(tokenId, amount)
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Successfully deposited ${inputAmount} SLEEP to Access Pass #${selectedCard.tokenId}!`);
      // Update mock data
      selectedCard.stakedAmount += parseFloat(inputAmount);
      setInputAmount('');
      setCurrentScreen('card-operations');
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedCard) return;
    setIsProcessing(true);
    try {
      // Mock call to SleepAccessPass.unstake(tokenId, amount)
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Successfully withdrawn ${inputAmount} SLEEP from Access Pass #${selectedCard.tokenId}!`);
      // Update mock data
      selectedCard.stakedAmount -= parseFloat(inputAmount);
      setInputAmount('');
      setCurrentScreen('card-operations');
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimRewards = async () => {
    setIsProcessing(true);
    try {
      // Mock call to StakingRewards.claimReward() and claimSleepReward()
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Successfully claimed all rewards!');
      if (selectedCard) {
        selectedCard.claimableOKB = 0;
        selectedCard.claimableSLEEP = 0;
      }
      setCurrentScreen('card-operations');
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle card insertion
  const handleInsertCard = async () => {
    if (userAccessPasses.length === 0) {
      setCurrentScreen('no-cards');
      return;
    }

    setCurrentScreen('card-reading');
    
    // Simulate card reading process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (userAccessPasses.length === 1) {
      // If only one card, select it automatically
      setSelectedCard(userAccessPasses[0]);
      setCurrentScreen('card-operations');
    } else {
      // If multiple cards, show selection screen
      setCurrentScreen('card-selection');
    }
  };

  // ATM Screen Content Renderer
  const renderATMScreen = () => {
    switch (currentScreen) {
      case 'main':
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">🏦 Sleep Protocol Staking ATM</div>
            
            {/* Protocol Statistics - Main Display */}
            <div className="xp-group-box">
              <div className="xp-group-title">📊 Protocol Status</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="xp-card text-center">
                  <div className="xp-text-large text-blue-600">💰 OKB Reward Pool</div>
                  <div className="xp-text-title">{parseFloat(formatUnits(BigInt(rewardPool), 18)).toFixed(4)} OKB</div>
                  <div className="xp-text">Available for stakers</div>
                </div>
                
                <div className="xp-card text-center">
                  <div className="xp-text-large text-purple-600">💤 SLEEP Reward Pool</div>
                  <div className="xp-text-title">{parseFloat(formatUnits(BigInt(sleepRewardPool ?? 0), 18)).toLocaleString()} SLEEP</div>
                  <div className="xp-text">From liquidation penalties</div>
                </div>
                
                <div className="xp-card text-center">
                  <div className="xp-text-large text-green-600">🔒 Total SLEEP Staked</div>
                  <div className="xp-text-title">{parseFloat(formatUnits(BigInt(totalStaked), sleepBalance?.decimals ?? 18)).toLocaleString()}</div>
                  <div className="xp-text">Across all Access Pass cards</div>
                </div>
              </div>
            </div>
            
            {/* Insert Card Section */}
            <div className="xp-group-box">
              <div className="xp-group-title">💳 Card Operations</div>
              <div className="text-center space-y-4">
                <div className="xp-text-large">Ready to start staking?</div>
                <button 
                  className="xp-button text-lg px-8 py-3"
                  onClick={handleInsertCard}
                  style={{minWidth: '200px', fontSize: '14px', fontWeight: 'bold'}}
                >
                  💳 INSERT ACCESS PASS CARD
                </button>
                <div className="xp-text">
                  Insert your Access Pass NFT to begin staking operations
                </div>
              </div>
            </div>
          </div>
        );

      case 'card-reading':
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">💳 Reading Access Pass...</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">🔍 Card Reader Status</div>
              
              <div className="text-center space-y-4">
                <div className="xp-text-large">Please wait while we read your card...</div>
                
                {/* Reading Animation */}
                <div className="flex justify-center items-center space-x-2 my-4">
                  <div className="xp-loading"></div>
                  <div className="xp-text">Processing...</div>
                </div>
                
                <div className="xp-card">
                  <div className="xp-text space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span>🔍</span>
                      <span>Scanning NFT data...</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>📊</span>
                      <span>Loading balance information...</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>🎁</span>
                      <span>Calculating rewards...</span>
                    </div>
                  </div>
                </div>
                
                <div className="xp-text text-blue-600">
                  ⚡ Connecting to blockchain...
                </div>
              </div>
            </div>
          </div>
        );

      case 'card-selection':
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">💳 Select Your Access Pass Card</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Available Cards</div>
              
              <div className="xp-text mb-4">
                Please select which Access Pass NFT you want to use:
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {userAccessPasses.map((nft) => (
                  <div
                    key={nft.tokenId}
                    className="xp-card cursor-pointer"
                    onClick={() => {
                      setSelectedCard(nft);
                      setCurrentScreen('card-operations');
                    }}
                  >
                    <div className="xp-text-large text-blue-600">Access Pass #{nft.tokenId}</div>
                    <div className="xp-text mt-2 space-y-1">
                      <div>💰 Staked: {nft.stakedAmount.toFixed(2)} SLEEP</div>
                      <div>🎁 OKB Rewards: {nft.claimableOKB.toFixed(2)}</div>
                      <div>💤 SLEEP Rewards: {nft.claimableSLEEP.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <button 
                  className="xp-button"
                  onClick={() => setCurrentScreen('main')}
                >
                  ← Back to Main
                </button>
              </div>
            </div>
          </div>
        );

      case 'card-operations':
        if (!selectedCard) return null;
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">💳 Access Pass #{selectedCard.tokenId}</div>
            
            {/* Card Balance Display */}
            <div className="xp-group-box">
              <div className="xp-group-title">💰 Account Balance</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="xp-card text-center">
                  <div className="xp-text-large text-green-600">💰 Staked Balance</div>
                  <div className="xp-text-title">{selectedCard.stakedAmount.toFixed(2)} SLEEP</div>
                </div>
                <div className="xp-card text-center">
                  <div className="xp-text-large text-blue-600">🎁 Claimable OKB</div>
                  <div className="xp-text-title">{selectedCard.claimableOKB.toFixed(2)}</div>
                </div>
                <div className="xp-card text-center">
                  <div className="xp-text-large text-purple-600">💤 Claimable SLEEP</div>
                  <div className="xp-text-title">{selectedCard.claimableSLEEP.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            {/* Transaction Options */}
            <div className="xp-group-box">
              <div className="xp-group-title">Transaction Options</div>
              <div className="xp-text-large mb-4">Select Transaction:</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button 
                  className="xp-button py-3"
                  onClick={() => setCurrentScreen('deposit')}
                  style={{fontSize: '12px'}}
                >
                  💰 DEPOSIT SLEEP
                </button>
                <button 
                  className="xp-button py-3"
                  onClick={() => setCurrentScreen('withdraw')}
                  disabled={selectedCard.stakedAmount === 0}
                  style={{fontSize: '12px'}}
                >
                  💸 WITHDRAW SLEEP
                </button>
                <button 
                  className="xp-button py-3"
                  onClick={() => setCurrentScreen('claim-rewards')}
                  disabled={selectedCard.claimableOKB === 0 && selectedCard.claimableSLEEP === 0}
                  style={{fontSize: '12px'}}
                >
                  🎁 CLAIM REWARDS
                </button>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button 
                  className="xp-button"
                  onClick={() => setCurrentScreen('card-selection')}
                >
                  🔄 Change Card
                </button>
                <button 
                  className="xp-button"
                  onClick={() => {
                    setSelectedCard(null);
                    setCurrentScreen('main');
                  }}
                >
                  📤 Eject Card
                </button>
              </div>
            </div>
          </div>
        );

      case 'deposit':
        if (!selectedCard) return null;
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">💰 Deposit SLEEP Tokens</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Account Information</div>
              <div className="xp-text mb-4">
                Access Pass #{selectedCard.tokenId} | Current Balance: {selectedCard.stakedAmount.toFixed(2)} SLEEP
              </div>
            </div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Amount to Deposit</div>
              <div className="xp-display text-center">
                <div className="text-lg mb-2">Enter Amount:</div>
                <div className="text-2xl font-mono">
                  {inputAmount || '0.00'} SLEEP
                </div>
              </div>
            </div>
            
            {isProcessing ? (
              <div className="xp-group-box">
                <div className="xp-group-title">Processing</div>
                <div className="text-center space-y-4">
                  <div className="xp-text-large">Processing Transaction...</div>
                  <div className="xp-loading"></div>
                </div>
              </div>
            ) : (
              <div className="xp-group-box">
                <div className="xp-group-title">Keypad</div>
                <div className="grid grid-cols-3 gap-2 mb-4 justify-center max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', '.'].map((key) => (
                    <button
                      key={key}
                      className="xp-keypad-button"
                      onClick={() => handleKeypadInput(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button 
                    className="xp-button"
                    onClick={() => handleKeypadInput('ENTER')}
                    disabled={!inputAmount || parseFloat(inputAmount) <= 0}
                    style={{backgroundColor: !inputAmount || parseFloat(inputAmount) <= 0 ? '#f0f0f0' : undefined}}
                  >
                    ✅ Confirm Deposit
                  </button>
                  <button 
                    className="xp-button"
                    onClick={() => handleKeypadInput('CANCEL')}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'withdraw':
        if (!selectedCard) return null;
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">💸 Withdraw SLEEP Tokens</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Account Information</div>
              <div className="xp-text mb-4">
                Access Pass #{selectedCard.tokenId} | Available: {selectedCard.stakedAmount.toFixed(2)} SLEEP
              </div>
            </div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Amount to Withdraw</div>
              <div className="xp-display text-center">
                <div className="text-lg mb-2">Enter Amount:</div>
                <div className="text-2xl font-mono">
                  {inputAmount || '0.00'} SLEEP
                </div>
              </div>
            </div>
            
            {isProcessing ? (
              <div className="xp-group-box">
                <div className="xp-group-title">Processing</div>
                <div className="text-center space-y-4">
                  <div className="xp-text-large">Processing Transaction...</div>
                  <div className="xp-loading"></div>
                </div>
              </div>
            ) : (
              <div className="xp-group-box">
                <div className="xp-group-title">Keypad</div>
                <div className="grid grid-cols-3 gap-2 mb-4 justify-center max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'MAX', '0', '.'].map((key) => (
                    <button
                      key={key}
                      className="xp-keypad-button"
                      onClick={() => {
                        if (key === 'MAX') {
                          setInputAmount(selectedCard.stakedAmount.toString());
                        } else {
                          handleKeypadInput(key);
                        }
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button 
                    className="xp-button"
                    onClick={() => handleKeypadInput('ENTER')}
                    disabled={!inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > selectedCard.stakedAmount}
                    style={{backgroundColor: (!inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > selectedCard.stakedAmount) ? '#f0f0f0' : undefined}}
                  >
                    ✅ Confirm Withdraw
                  </button>
                  <button 
                    className="xp-button"
                    onClick={() => handleKeypadInput('CANCEL')}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'claim-rewards':
        if (!selectedCard) return null;
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">🎁 Claim Rewards</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Available Rewards</div>
              <div className="xp-text mb-4">
                Access Pass #{selectedCard.tokenId}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="xp-card text-center">
                  <div className="xp-text-large text-blue-600">💰 OKB Rewards</div>
                  <div className="xp-text-title">{selectedCard.claimableOKB.toFixed(2)} OKB</div>
                  <div className="xp-text">From minting fees</div>
                </div>
                
                <div className="xp-card text-center">
                  <div className="xp-text-large text-purple-600">💤 SLEEP Rewards</div>
                  <div className="xp-text-title">{selectedCard.claimableSLEEP.toFixed(2)} SLEEP</div>
                  <div className="xp-text">From liquidation penalties</div>
                </div>
              </div>
            </div>
            
            {isProcessing ? (
              <div className="xp-group-box">
                <div className="xp-group-title">Processing</div>
                <div className="text-center space-y-4">
                  <div className="xp-text-large">Processing Transaction...</div>
                  <div className="xp-loading"></div>
                </div>
              </div>
            ) : (
              <div className="xp-group-box">
                <div className="xp-group-title">Actions</div>
                <div className="flex gap-4 justify-center">
                  <button 
                    className="xp-button"
                    onClick={handleClaimRewards}
                    disabled={selectedCard.claimableOKB === 0 && selectedCard.claimableSLEEP === 0}
                    style={{backgroundColor: (selectedCard.claimableOKB === 0 && selectedCard.claimableSLEEP === 0) ? '#f0f0f0' : undefined}}
                  >
                    🎁 Claim All Rewards
                  </button>
                  <button 
                    className="xp-button"
                    onClick={() => setCurrentScreen('card-operations')}
                  >
                    ← Back to Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        );


      case 'connect-wallet':
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4">🔌 Wallet Connection Required</div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">Connection Status</div>
              <div className="xp-card">
                <ConnectWalletInfo />
              </div>
              
              <div className="mt-4">
                <button 
                  className="xp-button"
                  onClick={() => setCurrentScreen('main')}
                >
                  ← Back to Main
                </button>
              </div>
            </div>
          </div>
        );

      case 'no-cards':
        return (
          <div className="text-center">
            <div className="xp-text-title mb-4" style={{color: '#cc0000'}}>❌ No Access Pass Found</div>
            
            <div className="xp-group-box" style={{borderColor: '#cc0000'}}>
              <div className="xp-group-title" style={{color: '#cc0000'}}>Error</div>
              <div className="xp-text space-y-4">
                <div className="xp-text-large">You don't have any Access Pass NFTs</div>
                <div className="xp-text">You need an Access Pass to use the staking ATM</div>
              </div>
            </div>
            
            <div className="xp-group-box">
              <div className="xp-group-title">How to get an Access Pass</div>
              <div className="xp-text space-y-2">
                <div>1. Visit the Access Pass page</div>
                <div>2. Design your unique card</div>
                <div>3. Mint it for FREE (only gas fees)</div>
                <div>4. Return here to start staking!</div>
              </div>
              
              <div className="flex gap-4 justify-center mt-4">
                <button 
                  className="xp-button"
                  onClick={() => window.open('/access-pass', '_blank')}
                >
                  🎨 Get Access Pass
                </button>
                <button 
                  className="xp-button"
                  onClick={() => setCurrentScreen('main')}
                >
                  ← Back to Main
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-4">
      <Container className="max-w-4xl">
        <div className="min-h-screen flex items-center justify-center">
          {/* Windows XP Style Window */}
          <div className="xp-window w-full max-w-4xl">
            
            {/* XP Title Bar */}
            <div className="xp-titlebar">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs">🏦</span>
                  </div>
                  <span className="text-white font-bold text-sm">Sleep Protocol Staking ATM</span>
                </div>
                <div className="flex space-x-1">
                  <button className="xp-button-small">_</button>
                  <button className="xp-button-small">□</button>
                  <button className="xp-button-small">✕</button>
                </div>
              </div>
            </div>

            {/* XP Window Content */}
            <div className="xp-content">
              
              {/* Status Bar */}
              <div className="xp-status-bar mb-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <span>💳 {address ? `Connected: ${address.slice(0, 8)}...${address.slice(-8)}` : 'No Wallet Connected'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="xp-panel min-h-[500px] p-6">
                {renderATMScreen()}
              </div>

              {/* Bottom Status */}
              <div className="xp-status-bar mt-4">
                <div className="text-xs text-gray-600 text-center">
                  🔒 Secured by Smart Contracts | ⛽ Gas fees apply | Sleep Protocol v1.0
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </Container>
      
      {/* Windows XP Styles */}
      <style jsx>{`
        /* Windows XP Window Styles */
        .xp-window {
          background: #ece9d8;
          border: 3px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
          box-shadow: 4px 4px 8px rgba(0,0,0,0.3);
        }
        
        .xp-titlebar {
          background: linear-gradient(to bottom, #0997ff 0%, #0053ee 4%, #0050ee 96%, #06f 100%);
          border-bottom: 1px solid #0053ee;
          padding: 4px 8px;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
          font-weight: bold;
        }
        
        .xp-content {
          background: #ece9d8;
          padding: 8px;
        }
        
        .xp-panel {
          background: #ece9d8;
          border: 2px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
        }
        
        .xp-status-bar {
          background: #ece9d8;
          border: 1px inset #ece9d8;
          padding: 2px 8px;
          font-family: 'Tahoma', sans-serif;
          color: #000;
        }
        
        .xp-button {
          background: linear-gradient(to bottom, #ffffff 0%, #f0f0f0 46%, #e6e6e6 50%, #efefef 54%, #dfdfdf 100%);
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
          padding: 6px 16px;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
          color: #000;
          cursor: pointer;
          text-align: center;
          min-width: 75px;
          box-shadow: 1px 1px 0px #000000;
        }
        
        .xp-button:hover {
          background: linear-gradient(to bottom, #ffffff 0%, #f8f8f8 46%, #eeeeee 50%, #f7f7f7 54%, #e7e7e7 100%);
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-button:active {
          border: 2px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          background: linear-gradient(to bottom, #e0e0e0 0%, #f0f0f0 46%, #e6e6e6 50%, #efefef 54%, #dfdfdf 100%);
          box-shadow: inset 1px 1px 0px #000000;
        }
        
        .xp-button:disabled {
          color: #808080;
          background: #f0f0f0;
          cursor: default;
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-button-small {
          background: linear-gradient(to bottom, #ffffff 0%, #f0f0f0 46%, #e6e6e6 50%, #efefef 54%, #dfdfdf 100%);
          border: 1px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
          width: 18px;
          height: 16px;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 10px;
          color: #000;
          cursor: pointer;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .xp-button-small:hover {
          background: linear-gradient(to bottom, #ffffff 0%, #f8f8f8 46%, #eeeeee 50%, #f7f7f7 54%, #e7e7e7 100%);
          border: 1px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-button-small:active {
          border: 1px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
        }
        
        .xp-input {
          border: 2px inset #ece9d8;
          background: #ffffff;
          padding: 2px 4px;
          font-family: 'Tahoma', sans-serif;
          font-size: 11px;
          color: #000;
        }
        
        .xp-group-box {
          border: 2px groove #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          padding: 16px 8px 8px 8px;
          margin: 8px 0;
          position: relative;
          background: #ece9d8;
        }
        
        .xp-group-title {
          position: absolute;
          top: -8px;
          left: 8px;
          background: #ece9d8;
          padding: 0 4px;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
          color: #000;
          font-weight: normal;
        }
        
        .xp-keypad-button {
          background: linear-gradient(to bottom, #ffffff 0%, #f0f0f0 46%, #e6e6e6 50%, #efefef 54%, #dfdfdf 100%);
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
          width: 50px;
          height: 35px;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
          font-weight: normal;
          color: #000;
          cursor: pointer;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 1px 1px 0px #000000;
        }
        
        .xp-keypad-button:hover {
          background: linear-gradient(to bottom, #ffffff 0%, #f8f8f8 46%, #eeeeee 50%, #f7f7f7 54%, #e7e7e7 100%);
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-keypad-button:active {
          border: 2px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          background: linear-gradient(to bottom, #e0e0e0 0%, #f0f0f0 46%, #e6e6e6 50%, #efefef 54%, #dfdfdf 100%);
          box-shadow: inset 1px 1px 0px #000000;
        }
        
        .xp-keypad-button:disabled {
          color: #808080;
          background: #f0f0f0;
          cursor: default;
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-text {
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 11px;
          color: #000;
        }
        
        .xp-text-large {
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 12px;
          color: #000;
          font-weight: bold;
        }
        
        .xp-text-title {
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
          font-size: 14px;
          color: #000080;
          font-weight: bold;
        }
        
        .xp-display {
          background: #000;
          color: #00ff00;
          border: 2px inset #ece9d8;
          padding: 8px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          min-height: 200px;
        }
        
        .xp-card {
          background: #ffffff;
          border: 2px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          padding: 8px;
          margin: 4px 0;
          cursor: pointer;
          font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
        }
        
        .xp-card:hover {
          background: #e0e0ff;
          border: 2px outset #d4d0c8;
          border-top-color: #ffffff;
          border-left-color: #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        
        .xp-card.selected {
          background: #316ac5;
          color: #ffffff;
          border: 2px inset #d4d0c8;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
        }
        
        /* Loading Animation */
        .xp-loading {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #c0c0c0;
          border-radius: 50%;
          border-top-color: #0000ff;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default StakePage;
