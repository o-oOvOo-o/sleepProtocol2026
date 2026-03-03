import React, { useRef } from 'react'

import { useApplications } from '../../hooks/useApplications'
import { useDrag } from '../../hooks/useDrag'
import { Application } from '../../store/application/reducer'

import {
  Win98WindowStyled,
  Win98WindowHeader,
  Win98WindowIcon,
  Win98WindowTitle,
  Win98ControlBox,
  Win98ControlButton,
  Win98WindowContent,
} from '../../styles/win98sm.styles'

interface Props {
  application: Application
  onClose: () => void

  children?: React.ReactNode
}

const ApplicationWindow: React.FC<Props> = ({
  application,
  children,
  onClose,
}) => {
  const { applicationType, isFocused, isMaximized, isMinimized } = application
  const ref = useRef<HTMLDivElement>(null)

  const { focusApplication, minimizeApplication, maximizeApplication, restoreApplication } = useApplications()
  const { onMouseDown } = useDrag({ ref })

  const handleMinimize = () => {
    minimizeApplication(applicationType.name)
  }

  const handleMaximizeRestore = () => {
    if (isMaximized) {
      restoreApplication(applicationType.name)
    } else {
      maximizeApplication(applicationType.name)
    }
  }

  // Handle double-click on title bar to maximize/restore
  const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    
    // Don't maximize if window is currently being dragged
    // This prevents conflict with drag functionality
    e.preventDefault()
    e.stopPropagation()
    
    handleMaximizeRestore()
  }

  // Handle right-click context menu - prevent desktop menu from showing
  const handleContextMenu = (e: React.MouseEvent) => {
    // Stop the event from bubbling up to desktop
    e.stopPropagation()
    // Allow default browser context menu for application windows
    // (or you could implement application-specific context menus here)
  }

  // Don't render minimized windows
  if (isMinimized) {
    return null
  }

  return (
    <Win98WindowStyled
      isFocused={isFocused}
      isMaximized={isMaximized}
      onMouseDown={() => focusApplication(applicationType.name)}
      onContextMenu={handleContextMenu}
      ref={ref}
    >
      <Win98WindowHeader 
        isFocused={isFocused} 
        onMouseDown={onMouseDown}
        onDoubleClick={handleTitleBarDoubleClick}
      >
        <Win98WindowIcon src={applicationType.smallIconSrc} alt={applicationType.name} />
        <Win98WindowTitle>{applicationType.name}</Win98WindowTitle>
        <Win98ControlBox>
          <Win98ControlButton 
            type="minimize" 
            onClick={handleMinimize} 
            title="Minimize"
          />
          <Win98ControlButton 
            type="maximize" 
            onClick={handleMaximizeRestore} 
            title={isMaximized ? "Restore" : "Maximize"}
          />
          <Win98ControlButton 
            type="close" 
            onClick={onClose} 
            title="Close"
          />
        </Win98ControlBox>
      </Win98WindowHeader>
      <Win98WindowContent>
        {children}
      </Win98WindowContent>
    </Win98WindowStyled>
  )
}

export default ApplicationWindow
