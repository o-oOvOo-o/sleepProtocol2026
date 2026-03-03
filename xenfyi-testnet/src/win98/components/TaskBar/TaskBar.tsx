import React, { useState } from 'react'

import { useApplications } from '../../hooks/useApplications'
import useCurrentDate from '../../hooks/useCurrentDate'
import { Application } from '../../store/application/reducer'
import { Separator } from '../Separator/Separator'

import DateTimeSection from './NotificationArea/NotificationArea'
import StartButton from './StartButton/StartButton'
import { TaskBarStyled, TaskBarMainToolbar, TaskBarSeparator } from './TaskBar.styles'
import TaskEntry from './TaskEntry/TaskEntry'
import TaskBarContextMenu from './TaskBarContextMenu'

const TaskBar: React.FC = () => {
  const { applications } = useApplications()
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    application: Application | null;
  }>({ visible: false, x: 0, y: 0, application: null })

  const { changeApplicationFocus, restoreApplication, minimizeApplication } = useApplications()
  const onClick = (a: Application) => {
    if (a.isMinimized) {
      // If app is minimized, restore it
      restoreApplication(a.applicationType.name)
    } else if (a.isFocused) {
      // If app is focused and not minimized, minimize it
      minimizeApplication(a.applicationType.name)
    } else {
      // If app is not focused, bring it to focus
      changeApplicationFocus(a.applicationType.name, true)
    }
  }

  const handleTaskContextMenu = (event: React.MouseEvent<HTMLElement>, application: Application) => {
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY - 100, // Position above taskbar
      application
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, application: null })
  }

  const currentDate = useCurrentDate()

  return (
    <TaskBarStyled>
      <StartButton />
      <TaskBarMainToolbar>
        {applications.map((a) => (
          <TaskEntry
            key={a.applicationType.name}
            application={a}
            onClick={() => onClick(a)}
            onContextMenu={handleTaskContextMenu}
          />
        ))}
      </TaskBarMainToolbar>
      <TaskBarSeparator />
      <DateTimeSection date={currentDate} />
      <TaskBarContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        application={contextMenu.application}
        onClose={handleCloseContextMenu}
      />
    </TaskBarStyled>
  )
}

export default TaskBar
