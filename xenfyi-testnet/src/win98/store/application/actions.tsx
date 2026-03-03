import { ApplicationType } from './ApplicationType'

export const OPEN_APPLICATION = 'application/OPEN'
export const CLOSE_APPLICATION = 'application/CLOSE'
export const CHANGE_APPLICATION_FOCUS = 'application/CHANGE_FOCUS'
export const MINIMIZE_APPLICATION = 'application/MINIMIZE'
export const MAXIMIZE_APPLICATION = 'application/MAXIMIZE'
export const RESTORE_APPLICATION = 'application/RESTORE'

interface OpenApplicationAction {
  type: typeof OPEN_APPLICATION
  applicationType: ApplicationType
  isBackdropShown?: boolean
}

interface CloseApplicationAction {
  type: typeof CLOSE_APPLICATION
  applicationName: string
}

interface ChangeApplicationFocusAction {
  type: typeof CHANGE_APPLICATION_FOCUS
  applicationName: string
  isFocused: boolean
}

interface MinimizeApplicationAction {
  type: typeof MINIMIZE_APPLICATION
  applicationName: string
}

interface MaximizeApplicationAction {
  type: typeof MAXIMIZE_APPLICATION
  applicationName: string
}

interface RestoreApplicationAction {
  type: typeof RESTORE_APPLICATION
  applicationName: string
}

export const openApplication = (
  applicationType: ApplicationType,
  isBackdropShown?: boolean
): OpenApplicationAction => ({
  type: OPEN_APPLICATION,
  applicationType,
  isBackdropShown,
})

export const closeApplication = (
  applicationName: string
): CloseApplicationAction => ({
  type: CLOSE_APPLICATION,
  applicationName,
})

export const changeApplicationFocus = (
  applicationName: string,
  isFocused: boolean
): ChangeApplicationFocusAction => ({
  type: CHANGE_APPLICATION_FOCUS,
  applicationName,
  isFocused,
})

export const minimizeApplication = (
  applicationName: string
): MinimizeApplicationAction => ({
  type: MINIMIZE_APPLICATION,
  applicationName,
})

export const maximizeApplication = (
  applicationName: string
): MaximizeApplicationAction => ({
  type: MAXIMIZE_APPLICATION,
  applicationName,
})

export const restoreApplication = (
  applicationName: string
): RestoreApplicationAction => ({
  type: RESTORE_APPLICATION,
  applicationName,
})

export type ApplicationAction =
  | OpenApplicationAction
  | CloseApplicationAction
  | ChangeApplicationFocusAction
  | MinimizeApplicationAction
  | MaximizeApplicationAction
  | RestoreApplicationAction
