import React from 'react'

import { useApplications } from '../../hooks/useApplications'
import { ApplicationType } from '../../store/application/ApplicationType'
import Icon from '../Icon/Icon'

import { DesktopGridEntry, DesktopGridStyled } from './DesktopGrid.styles'

const DESKTOP_APPLICATION_TYPES: ApplicationType[] = [
  ApplicationType.SleepProtocol,
  ApplicationType.SwapDex,
  ApplicationType.SleepWebsite,
  ApplicationType.MyComputer,
  ApplicationType.RecycleBin,
  ApplicationType.InternetExplorer,
  ApplicationType.Docs,
  ApplicationType.Winamp,
]

const DesktopGrid: React.FC = () => {
  const { openApplication } = useApplications()

  const onDoubleClick = (applicationType: ApplicationType) => {
    // Check if it's an external link
    if (applicationType.externalUrl) {
      window.open(applicationType.externalUrl, '_blank');
      return;
    }
    openApplication(applicationType)
  }

  return (
    <DesktopGridStyled>
      {DESKTOP_APPLICATION_TYPES.map((at) => (
        <DesktopGridEntry key={at.name} onDoubleClick={() => onDoubleClick(at)}>
          <Icon src={at.iconSrc} alt={at.name} />
          <span>{at.name}</span>
        </DesktopGridEntry>
      ))}
    </DesktopGridStyled>
  )
}

export default DesktopGrid
