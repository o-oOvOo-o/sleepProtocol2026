import React from 'react'

import { useApplications } from '../../../hooks/useApplications'
const applicationHourglassIcon = '/win98/assets/icons/application-hourglass-icon.png'
const dirExecIcon = '/win98/assets/icons/dir-exec-icon.png'
const helpIcon = '/win98/assets/icons/help-book-icon.png'
const searchIcon = '/win98/assets/icons/search-file-icon.png'
const settingsIcon = '/win98/assets/icons/settings-icon.png'
const shutDownIcon = '/win98/assets/icons/shut-down-icon.png'
const winKeyIcon = '/win98/assets/icons/win-key-icon.png'
const winUpdate = '/win98/assets/icons/win-update.png'
import { ApplicationType } from '../../../store/application/ApplicationType'
import Icon from '../../Icon/Icon'
import { Separator } from '../../Separator/Separator'

import {
  StartMenuBlueLine,
  StartMenuEntries,
  StartMenuStyled,
  StartMenuEntry as StartMenuEntryComponent,
} from './StartMenu.styles'

interface Props {
  closeMenu: () => void
}

interface StartMenuEntry {
  icon: string
  label: string
  onClick?: () => void
}

const StartMenu: React.FC<Props> = ({ closeMenu }) => {
  const { openApplication } = useApplications()

  const entries: (StartMenuEntry | 'separator')[] = [
    {
      icon: ApplicationType.SleepProtocol.smallIconSrc,
      label: 'Sleep Protocol',
      onClick: () => openApplication(ApplicationType.SleepProtocol),
    },
    {
      icon: ApplicationType.SleepWebsite.smallIconSrc,
      label: 'Sleep Website',
      onClick: () => {
        if (ApplicationType.SleepWebsite.externalUrl) {
          window.open(ApplicationType.SleepWebsite.externalUrl, '_blank');
        }
      },
    },
    {
      icon: ApplicationType.InternetExplorer.smallIconSrc,
      label: 'Internet Explorer',
      onClick: () => openApplication(ApplicationType.InternetExplorer),
    },
    'separator',
    {
      icon: winUpdate,
      label: 'Windows Update',
    },
    'separator',
    {
      icon: dirExecIcon,
      label: 'Programs',
    },
    {
      icon: settingsIcon,
      label: 'Settings',
    },
    {
      icon: searchIcon,
      label: 'Find',
    },
    {
      icon: applicationHourglassIcon,
      label: 'Run',
    },
    {
      icon: helpIcon,
      label: 'About',
      onClick: () => openApplication(ApplicationType.About),
    },
    'separator',
    {
      icon: winKeyIcon,
      label: 'Log Off...',
    },
    {
      icon: shutDownIcon,
      label: 'Shut Down...',
      onClick: () => openApplication(ApplicationType.ShutDown, true),
    },
  ]
  return (
    <StartMenuStyled>
      <StartMenuBlueLine>
        <span>Windows98</span>
      </StartMenuBlueLine>
      <StartMenuEntries>
        {entries.map((entry, index) =>
          entry === 'separator' ? (
            <Separator key={index} />
          ) : (
            <StartMenuEntryComponent
              key={entry.label}
              onClick={() => entry.onClick?.() && closeMenu()}
              disabled={!entry.onClick}
            >
              <Icon src={entry.icon} alt={entry.label} />
              <span>{entry.label}</span>
            </StartMenuEntryComponent>
          )
        )}
      </StartMenuEntries>
    </StartMenuStyled>
  )
}

export default StartMenu
