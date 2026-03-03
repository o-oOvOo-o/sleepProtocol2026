import { ThemeProvider } from '@emotion/react'
import React from 'react'
import { Provider as StoreProvider } from 'react-redux'
import { useTranslation } from 'next-i18next'

import { store } from './store/store'
import { theme } from './styles/theme'
import MainWindow from './components/MainWindow/MainWindow'

export const Win98: React.FC = () => {
  // 确保 i18n 上下文可用
  const { i18n, ready } = useTranslation('common');
  
  // 调试信息
  console.log('Win98 i18n Debug:', {
    language: i18n?.language,
    ready: ready,
    isReady: i18n?.isInitialized,
    hasCommon: i18n?.hasLoadedNamespace ? i18n.hasLoadedNamespace('common') : 'unknown'
  });

  // 等待 i18n 准备就绪
  if (!ready) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#008080',
        color: 'white',
        fontFamily: '"MS Sans Serif", sans-serif'
      }}>
        Loading translations...
      </div>
    );
  }

  return (
    <StoreProvider store={store}>
      <ThemeProvider theme={theme}>
        <MainWindow />
      </ThemeProvider>
    </StoreProvider>
  )
}

export default Win98
