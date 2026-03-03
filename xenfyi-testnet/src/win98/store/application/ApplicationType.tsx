import React from 'react'
import dynamic from 'next/dynamic';

import { AboutApplication } from '../../components/applications/AboutApplication'
import Docs from '../../components/applications/Docs/Docs'
import { ShutDownApplication } from '../../components/applications/ShutDownApplication'
import SleepProtocolWrapper from '../../components/applications/SleepProtocolWrapper'
import InternetExplorerApp from '../../components/applications/InternetExplorer'
// import Winamp from '../../components/applications/Winamp'

const Winamp = dynamic(
  () => import('../../components/applications/Winamp'),
  { ssr: false }
);

const helpBookIcon = '/win98/assets/icons/help-book-icon.png'
const helpBookSmIcon = '/win98/assets/icons/help-book-sm-icon.png'
const ieIcon = '/win98/assets/icons/ie-icon.png'
const ieSmIcon = '/win98/assets/icons/ie-sm-icon.png'
const sleepIcon = '/win98/assets/icons/w98-icon.png'  // 暂时使用w98图标
const sleepSmIcon = '/win98/assets/icons/w98-icon.png'
const myComputerIcon = '/win98/assets/icons/my-computer-icon.png'
const myComputerSmIcon = '/win98/assets/icons/my-computer-sm-icon.png'
const notepadIcon = '/win98/assets/icons/notepad-icon.png'
const notepadSmIcon = '/win98/assets/icons/notepad-sm-icon.png'
const recycleBinEmptyIcon = '/win98/assets/icons/recycle-bin-empty-icon.png'
const recycleBinEmptySmIcon = '/win98/assets/icons/recycle-bin-empty-sm-icon.png'
const shutDownIcon = '/win98/assets/icons/shut-down-icon.png'
const shutDownSmIcon = '/win98/assets/icons/shut-down-sm-icon.png'
const winampIcon = '/win98/assets/icons/winamp-icon.png'
const winampSmIcon = '/win98/assets/icons/winamp-icon.png'

const dummyContent = (
  <div style={{ width: '200px', height: '100px' }} />
)

export class ApplicationType {
  static readonly MyComputer = new ApplicationType(
    'My Computer',
    dummyContent,
    myComputerIcon,
    myComputerSmIcon
  )

  static readonly RecycleBin = new ApplicationType(
    'Recycle Bin',
    dummyContent,
    recycleBinEmptyIcon,
    recycleBinEmptySmIcon
  )

  static readonly InternetExplorer = new ApplicationType(
    'Internet Explorer', 
    <InternetExplorerApp />,
    ieIcon,
    ieSmIcon
  )

  static readonly SleepProtocol = new ApplicationType(
    'Sleep Protocol',
    <SleepProtocolWrapper />,
    sleepIcon,
    sleepSmIcon
  )

  static readonly SleepWebsite = new ApplicationType(
    'Sleep Website', 
    dummyContent,  // Will handle externally
    myComputerIcon,  // Different icon to distinguish
    myComputerSmIcon,
    '/app/dashboard'  // External URL
  )

  static readonly SwapDex = new ApplicationType(
    'Plasma Swap', 
    dummyContent,  // Will handle externally
    '/win98/assets/icons/settings-icon.png',  // Using settings icon for Swap
    '/win98/assets/icons/settings-icon.png',
    '/swap'  // External URL to Swap page
  )

  static readonly Docs = new ApplicationType(
    'Docs',
    <Docs />,
    notepadIcon,
    notepadSmIcon
  )

  static readonly About = new ApplicationType(
    'About',
    <AboutApplication />,
    helpBookIcon,
    helpBookSmIcon
  )

  static readonly ShutDown = new ApplicationType(
    'Shut Down...',
    <ShutDownApplication />,
    shutDownIcon,
    shutDownSmIcon
  )

  static readonly Winamp = new ApplicationType(
    'Winamp',
    <Winamp />,
    winampIcon,
    winampSmIcon
  )

  constructor(
    readonly name: string,
    readonly content: React.ReactElement,
    readonly iconSrc: string,
    readonly smallIconSrc: string,
    readonly externalUrl?: string
  ) {}
}
