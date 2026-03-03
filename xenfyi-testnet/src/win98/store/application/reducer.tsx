import {
  ApplicationAction,
  CHANGE_APPLICATION_FOCUS,
  CLOSE_APPLICATION,
  MAXIMIZE_APPLICATION,
  MINIMIZE_APPLICATION,
  OPEN_APPLICATION,
  RESTORE_APPLICATION,
} from './actions'
import { ApplicationType } from './ApplicationType'

export interface Application {
  applicationType: ApplicationType
  isFocused: boolean
  isMinimized: boolean
  isMaximized: boolean
}

interface ApplicationState {
  openedApplications: Application[]
  isBackdropShown: boolean
}

const initialState: ApplicationState = {
  openedApplications: [],
  isBackdropShown: false,
}

export function applicationReducer(
  state = initialState,
  action: ApplicationAction
): ApplicationState {
  switch (action.type) {
    case OPEN_APPLICATION:
      // Unfocus other apps except given one
      const openedApplications = state.openedApplications.map((a) => ({
        ...a,
        isFocused: a.applicationType.name === action.applicationType.name,
      }))

      // Do not open given app 2nd time in case it's opened
      const isOpened = !!state.openedApplications.find(
        (a) => a.applicationType.name === action.applicationType.name
      )
      const appsToOpen: Application[] = !isOpened
        ? [
            {
              applicationType: action.applicationType,
              isFocused: true,
              isMinimized: false,
              isMaximized: false,
            },
          ]
        : []

      return {
        ...state,
        ...(action.isBackdropShown === true ? { isBackdropShown: true } : {}),
        openedApplications: [...openedApplications, ...appsToOpen],
      }

    case CLOSE_APPLICATION:
      // TODO focus last application
      return {
        ...state,
        openedApplications: state.openedApplications.filter(
          (a) => a.applicationType.name !== action.applicationName
        ),
        isBackdropShown: false,
      }

    case CHANGE_APPLICATION_FOCUS:
      return {
        ...state,
        openedApplications: state.openedApplications.map((a) => ({
          ...a,
          isFocused:
            a.applicationType.name === action.applicationName
              ? action.isFocused
              : false,
        })),
      }

    case MINIMIZE_APPLICATION:
      return {
        ...state,
        openedApplications: state.openedApplications.map((a) => ({
          ...a,
          isMinimized:
            a.applicationType.name === action.applicationName
              ? true
              : a.isMinimized,
          isFocused:
            a.applicationType.name === action.applicationName
              ? false
              : a.isFocused,
        })),
      }

    case MAXIMIZE_APPLICATION:
      return {
        ...state,
        openedApplications: state.openedApplications.map((a) => ({
          ...a,
          isMaximized:
            a.applicationType.name === action.applicationName
              ? true
              : a.isMaximized,
          isMinimized:
            a.applicationType.name === action.applicationName
              ? false
              : a.isMinimized,
          isFocused:
            a.applicationType.name === action.applicationName
              ? true
              : false,
        })),
      }

    case RESTORE_APPLICATION:
      return {
        ...state,
        openedApplications: state.openedApplications.map((a) => ({
          ...a,
          isMaximized:
            a.applicationType.name === action.applicationName
              ? false
              : a.isMaximized,
          isMinimized:
            a.applicationType.name === action.applicationName
              ? false
              : a.isMinimized,
          isFocused:
            a.applicationType.name === action.applicationName
              ? true
              : false,
        })),
      }

    default:
      return state
  }
}
