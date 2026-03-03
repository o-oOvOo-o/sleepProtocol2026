import styled from '@emotion/styled'
import React, { useEffect, useState } from 'react'

import { useBiosLoading } from '../../hooks/useBiosLoading'
import { useShutDown } from '../../hooks/useShutDown'
import { useSystemLoading } from '../../hooks/useSystemLoading'
import { useWindowsLoading } from '../../hooks/useWindowsLoading'
import { useAudio } from '../../hooks/useAudio'
import { useVolume } from '../../hooks/useVolume'
const cursorDefault = '/win98/assets/cursor-default.png'
const cursorLoading = '/win98/assets/cursor-loading.png'
import { BiosStartupScreen } from '../BiosStartupScreen/BiosStartupScreen'
import DesktopGrid from '../DesktopGrid/DesktopGrid'
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary'
import { ModalRoot } from '../ModalRoot/ModalRoot'
import { ShutDownScreen } from '../ShutDownScreen/ShutDownScreen'
import TaskBar from '../TaskBar/TaskBar'
import { WindowsStartupScreen } from '../WindowsStartupScreen/WindowsStartupScreen'
import ContextMenu from '../ContextMenu/ContextMenu'

const MainWindowStyled = styled.div<{ isSystemLoading?: boolean }>`
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  cursor: url(${({ isSystemLoading }) =>
      isSystemLoading ? cursorLoading : cursorDefault}),
    auto;
  font-family: ${({ theme }) => theme.fontFamilies.windows95};
  user-select: none;
  overflow: hidden;

  img {
    image-rendering: pixelated;
  }
`

const DesktopBackground = styled.div`
  flex: 1;
  background: #008080;
  position: relative;
`
const MainWindow: React.FC = () => {
  const { isWindowsLoaded } = useWindowsLoading()
  const { isBiosLoaded } = useBiosLoading()
  const { isShutDown } = useShutDown()
  const { isSystemLoading } = useSystemLoading()
  const { playAudio } = useAudio()
  const { volume } = useVolume()
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })

  // 播放开机音乐（当桌面首次加载时）
  useEffect(() => {
    if (isBiosLoaded && isWindowsLoaded && !isShutDown && volume > 0) {
      // playAudio('startup.mp3').catch(() => {
      //   // 忽略音频播放失败（可能是浏览器自动播放策略）
      //   console.log('开机音乐播放失败，可能需要用户交互')
      // })
    }
  }, [isBiosLoaded, isWindowsLoaded, isShutDown, playAudio, volume])

  // Handle right-click context menu (only for desktop background)
  const handleContextMenu = (event: React.MouseEvent) => {
    // Only show context menu if clicking on desktop background
    const target = event.target as HTMLElement;
    const isDesktopBackground = target.classList.contains('desktop-background') || 
                               target === event.currentTarget ||
                               target.closest('.desktop-background');
    
    if (isDesktopBackground) {
      // Prevent default browser context menu
      event.preventDefault()
      
      // Show context menu when right-clicking on desktop area
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY
      })
    }
  }

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 })
  }

  return (
    <MainWindowStyled 
      isSystemLoading={isSystemLoading}
    >
      <ErrorBoundary>
        {!isBiosLoaded ? (
          <BiosStartupScreen />
        ) : !isWindowsLoaded ? (
          <WindowsStartupScreen />
        ) : isShutDown ? (
          <ShutDownScreen />
        ) : (
          <React.Fragment>
            <ModalRoot />
            <DesktopBackground 
              className="desktop-background"
              onContextMenu={handleContextMenu}
            >
              <DesktopGrid />
            </DesktopBackground>
            <TaskBar />
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              visible={contextMenu.visible}
              onClose={handleCloseContextMenu}
            />
          </React.Fragment>
        )}
      </ErrorBoundary>
    </MainWindowStyled>
  )
}

export default MainWindow
