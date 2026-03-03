import React from 'react'

import { Application } from '../../../store/application/reducer'
import Icon from '../../Icon/Icon'

import { TaskEntryStyled } from './TaskEntry.styles'

interface Props {
  application: Application
  onClick: (event?: React.MouseEvent<HTMLElement>) => void
  onContextMenu?: (event: React.MouseEvent<HTMLElement>, application: Application) => void
}

const TaskEntry: React.FC<Props> = ({ application, onClick, onContextMenu }) => {
  // Show as pushed if focused and not minimized
  const isPushed = application.isFocused && !application.isMinimized
  // Show as focused if the application is focused (regardless of minimized state)
  const isFocused = application.isFocused

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (onContextMenu) {
      event.preventDefault();
      event.stopPropagation();
      onContextMenu(event, application);
    }
  };
  
  return (
    <TaskEntryStyled
      key={application.applicationType.name}
      isPushed={isPushed}
      isFocused={isFocused}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <Icon
        src={application.applicationType.smallIconSrc}
        alt={application.applicationType.name}
      />
      <span>{application.applicationType.name}</span>
    </TaskEntryStyled>
  )
}

export default TaskEntry
