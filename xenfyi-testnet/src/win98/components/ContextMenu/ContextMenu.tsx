import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useApplications } from '../../hooks/useApplications';
import { ApplicationType } from '../../store/application/ApplicationType';
import { useTranslation } from 'next-i18next';

const ContextMenuStyled = styled.div<{ x: number; y: number; visible: boolean }>`
  position: fixed;
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  min-width: 200px;
  z-index: 10000;
  display: ${props => props.visible ? 'block' : 'none'};
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 11px;
`;

const ContextMenuItem = styled.div<{ disabled?: boolean }>`
  padding: 4px 8px 4px 24px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  color: ${props => props.disabled ? '#808080' : 'black'};
  position: relative;
  
  &:hover {
    background: ${props => props.disabled ? 'transparent' : '#316AC5'};
    color: ${props => props.disabled ? '#808080' : 'white'};
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background-size: contain;
  }
`;

const ContextMenuSeparator = styled.div`
  height: 1px;
  background: #808080;
  margin: 2px 4px;
  border-top: 1px solid #404040;
`;

const SubMenu = styled.div<{ visible: boolean }>`
  position: absolute;
  left: 100%;
  top: -2px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  min-width: 150px;
  display: ${props => props.visible ? 'block' : 'none'};
`;

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, onClose }) => {
  const { t } = useTranslation('common');
  const { openApplication } = useApplications();
  const [showViewSubmenu, setShowViewSubmenu] = useState(false);
  const [showNewSubmenu, setShowNewSubmenu] = useState(false);

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

  const handleRefresh = () => {
    // Refresh desktop without closing windows - just close any open applications except system ones
    // This simulates a desktop refresh in Win98
    
    // Close context menu
    onClose();
    
    // Force a re-render of desktop icons by triggering a small delay
    setTimeout(() => {
      // You could add desktop refresh logic here
      // For now, we'll just provide visual feedback
      const refreshIndicator = document.createElement('div');
      refreshIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ffff99;
        border: 2px outset #c0c0c0;
        padding: 8px;
        font-family: 'MS Sans Serif', sans-serif;
        font-size: 11px;
        z-index: 10002;
      `;
      refreshIndicator.textContent = t('contextMenu.refreshed');
      document.body.appendChild(refreshIndicator);
      
      setTimeout(() => {
        refreshIndicator.remove();
      }, 2000);
    }, 100);
  };

  const handleOpenNotepad = () => {
    openApplication(ApplicationType.Docs);
    onClose();
  };

  const handleShowProperties = () => {
    // Create and show properties modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #c0c0c0;
      border: 2px outset #c0c0c0;
      padding: 16px;
      font-family: 'MS Sans Serif', sans-serif;
      font-size: 11px;
      z-index: 10001;
      min-width: 300px;
    `;
    
    modal.innerHTML = `
      <div style="background: #000080; color: white; padding: 4px 8px; margin: -16px -16px 12px -16px; font-weight: bold;">
        ${t('contextMenu.propertiesTitle')}
      </div>
      <div style="margin-bottom: 8px;"><strong>${t('contextMenu.version')}:</strong> 1.0.0</div>
      <div style="margin-bottom: 8px;"><strong>${t('contextMenu.build')}:</strong> Win98 Edition</div>
      <div style="margin-bottom: 8px;"><strong>${t('contextMenu.platform')}:</strong> Windows 98</div>
      <div style="margin-bottom: 8px;"><strong>${t('contextMenu.developer')}:</strong> Sleep Protocol Team</div>
      <div style="margin-bottom: 16px;"><strong>${t('contextMenu.description')}:</strong> ${t('contextMenu.descriptionText')}</div>
      <div style="text-align: center;">
        <button style="background: #c0c0c0; border: 2px outset #c0c0c0; padding: 4px 16px; font-family: inherit; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">
          OK
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    onClose();
  };

  return (
    <ContextMenuStyled x={x} y={y} visible={visible || false}>
      <ContextMenuItem 
        onMouseEnter={() => setShowViewSubmenu(true)}
        onMouseLeave={() => setShowViewSubmenu(false)}
        style={{ position: 'relative' }}
      >
        {t('contextMenu.view')}
        <span style={{ float: 'right' }}>►</span>
        <SubMenu visible={showViewSubmenu}>
          <ContextMenuItem onClick={() => { openApplication(ApplicationType.SleepProtocol); onClose(); }}>
            Sleep Protocol
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { openApplication(ApplicationType.MyComputer); onClose(); }}>
            My Computer
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { openApplication(ApplicationType.RecycleBin); onClose(); }}>
            Recycle Bin
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { openApplication(ApplicationType.InternetExplorer); onClose(); }}>
            Internet Explorer
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { openApplication(ApplicationType.Winamp); onClose(); }}>
            Winamp
          </ContextMenuItem>
        </SubMenu>
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={handleRefresh}>
        {t('contextMenu.refresh')}
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onMouseEnter={() => setShowNewSubmenu(true)}
        onMouseLeave={() => setShowNewSubmenu(false)}
        style={{ position: 'relative' }}
      >
        {t('contextMenu.new')}
        <span style={{ float: 'right' }}>►</span>
        <SubMenu visible={showNewSubmenu}>
          <ContextMenuItem onClick={handleOpenNotepad}>
            {t('contextMenu.notepadDocument')}
          </ContextMenuItem>
        </SubMenu>
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={handleShowProperties}>
        {t('contextMenu.properties')}
      </ContextMenuItem>
    </ContextMenuStyled>
  );
};

export default ContextMenu;
