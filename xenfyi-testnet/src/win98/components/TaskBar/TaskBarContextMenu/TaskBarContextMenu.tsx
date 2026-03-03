import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from 'next-i18next';
import { useApplications } from '../../../hooks/useApplications';
import { Application } from '../../../store/application/reducer';

const TaskBarContextMenuStyled = styled.div<{ x: number; y: number; visible: boolean }>`
  position: fixed;
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  min-width: 160px;
  z-index: 10000;
  display: ${props => props.visible ? 'block' : 'none'};
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
`;

const TaskBarContextMenuItem = styled.div<{ disabled?: boolean }>`
  padding: 4px 8px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  color: ${props => props.disabled ? '#808080' : 'black'};
  
  &:hover {
    background: ${props => props.disabled ? 'transparent' : '#316AC5'};
    color: ${props => props.disabled ? '#808080' : 'white'};
  }
`;

const TaskBarContextMenuSeparator = styled.div`
  height: 1px;
  background: #808080;
  margin: 2px 4px;
  border-top: 1px solid #404040;
`;

interface TaskBarContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  application: Application | null;
  onClose: () => void;
}

const TaskBarContextMenu: React.FC<TaskBarContextMenuProps> = ({ 
  x, y, visible, application, onClose 
}) => {
  const { t } = useTranslation('common');
  const { 
    restoreApplication, 
    minimizeApplication, 
    maximizeApplication, 
    closeApplication 
  } = useApplications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!application) return null;

  const handleRestore = () => {
    restoreApplication(application.applicationType.name);
    onClose();
  };

  const handleMinimize = () => {
    minimizeApplication(application.applicationType.name);
    onClose();
  };

  const handleClose = () => {
    closeApplication(application.applicationType.name);
    onClose();
  };

  const isMinimized = application.isMinimized;
  const isMaximized = application.isMaximized;
  const isNormal = !isMinimized && !isMaximized;

  return (
    <TaskBarContextMenuStyled x={x} y={y} visible={visible}>
      <TaskBarContextMenuItem 
        onClick={handleRestore}
        disabled={isNormal}
      >
        {t('taskBar.contextMenu.restore', '还原')}
      </TaskBarContextMenuItem>
      
      <TaskBarContextMenuItem 
        onClick={handleMinimize}
        disabled={isMinimized}
      >
        {t('taskBar.contextMenu.minimize', '最小化')}
      </TaskBarContextMenuItem>
      
      <TaskBarContextMenuSeparator />
      
      <TaskBarContextMenuItem onClick={handleClose}>
        {t('taskBar.contextMenu.close', '关闭')}
      </TaskBarContextMenuItem>
    </TaskBarContextMenuStyled>
  );
};

export default TaskBarContextMenu;
