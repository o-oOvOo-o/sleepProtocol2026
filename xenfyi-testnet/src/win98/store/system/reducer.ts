import { getEnvConfig } from '../../utils/getEnvConfig'

import {
  CHANGE_BIOS_LOADING_STATUS,
  CHANGE_IS_SHUT_DOWN,
  CHANGE_IS_SYSTEM_LOADING,
  CHANGE_VOLUME,
  CHANGE_WINDOWS_LOADING_STATUS,
  SystemAction,
} from './actions'

export interface SystemState {
  isBiosLoaded: boolean
  isWindowsLoaded: boolean

  isShutDown: boolean

  isSystemLoading: boolean

  volume: number
}

const initialState: SystemState = {
  isBiosLoaded: true,  // 跳过BIOS启动画面
  isWindowsLoaded: true,  // 跳过Windows启动画面

  isShutDown: false,

  isSystemLoading: false,

  volume: 0.5,  // 默认音量，确保开机音乐能播放
}

export function systemReducer(
  state = initialState,
  action: SystemAction
): SystemState {
  switch (action.type) {
    case CHANGE_BIOS_LOADING_STATUS:
      return {
        ...state,
        isBiosLoaded: action.loadingStatus,
      }
    case CHANGE_WINDOWS_LOADING_STATUS:
      return {
        ...state,
        isWindowsLoaded: action.loadingStatus,
      }
    case CHANGE_IS_SHUT_DOWN:
      return {
        ...state,
        isShutDown: action.isShutDown,
      }
    case CHANGE_IS_SYSTEM_LOADING:
      return {
        ...state,
        isSystemLoading: action.isSystemLoading,
      }
    case CHANGE_VOLUME:
      return {
        ...state,
        volume: action.volume,
      }
    default:
      return state
  }
}
