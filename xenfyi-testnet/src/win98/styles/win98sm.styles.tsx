import styled from '@emotion/styled'
import { css } from '@emotion/react'

// 基于 win98sm-master 的更纯正的 Win98 样式

// 窗口样式 - 使用 9-patch 边框图片
export const Win98WindowStyled = styled.div<{ isFocused: boolean; isMaximized?: boolean }>`
  background:
    url('/win98/assets/win98sm/window/topleft.png') no-repeat top left,
    url('/win98/assets/win98sm/window/topright.png') no-repeat top right,
    url('/win98/assets/win98sm/window/bottomleft.png') no-repeat bottom left,
    url('/win98/assets/win98sm/window/bottomright.png') no-repeat bottom right,
    url('/win98/assets/win98sm/window/left.png') repeat-y left,
    url('/win98/assets/win98sm/window/right.png') repeat-y right,
    url('/win98/assets/win98sm/window/bottom.png') repeat-x bottom,
    url('/win98/assets/win98sm/window/top.png') repeat-x top, 
    #C0C0C0;
  
  padding: 3px;
  min-width: 150px;
  min-height: 50px;
  position: absolute;
  
  ${({ isMaximized }) => 
    isMaximized 
      ? css`
          top: 0;
          left: 0;
          right: 0;
          bottom: 32px;
          width: 100%;
          height: calc(100% - 32px);
        `
      : css`
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          margin: auto;
          height: fit-content;
          width: fit-content;
        `
  };
  
  ${({ isFocused }) =>
    isFocused
      ? css`
          z-index: 1001;
        `
      : css`
          z-index: 1000;
        `
  };
`

// 窗口标题栏 - 更精确的Win98样式
export const Win98WindowHeader = styled.div<{ isFocused: boolean }>`
  ${({ isFocused }) => 
    isFocused 
      ? css`
          background: linear-gradient(to right, #00007B, #0884CE);
        `
      : css`
          background: linear-gradient(to right, #7B7B7B, #ADADAD);
        `
  };
  
  height: 18px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: default;
  user-select: none;
`

// 窗口图标
export const Win98WindowIcon = styled.img`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin: 1px 3px 1px 2px;
  padding: 0;
`

// 窗口标题文字
export const Win98WindowTitle = styled.span`
  color: white;
  font-size: 11px;
  font-weight: bold;
  margin: 3px 0 0 2px;
  flex: 1;
`

// 控制按钮容器
export const Win98ControlBox = styled.div`
  display: flex;
  margin-left: auto;
`

// 控制按钮 - 最小化、最大化、关闭
export const Win98ControlButton = styled.button<{ type: 'minimize' | 'maximize' | 'close' }>`
  width: 16px;
  height: 14px;
  margin: 2px 0 0 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  
  ${({ type }) => {
    switch (type) {
      case 'minimize':
        return css`
          background: url('/win98/assets/win98sm/window/min.png') no-repeat center;
          &:active {
            background: url('/win98/assets/win98sm/window/minp.png') no-repeat center;
          }
        `
      case 'maximize':
        return css`
          background: url('/win98/assets/win98sm/window/max.png') no-repeat center;
          &:active {
            background: url('/win98/assets/win98sm/window/maxp.png') no-repeat center;
          }
        `
      case 'close':
        return css`
          background: url('/win98/assets/win98sm/window/close.png') no-repeat center;
          margin-right: 2px;
          &:active {
            background: url('/win98/assets/win98sm/window/closep.png') no-repeat center;
          }
        `
    }
  }}
  
  &:hover {
    filter: brightness(1.1);
  }
`

// 窗口内容区域
export const Win98WindowContent = styled.div`
  padding: 0;
  margin: 0;
  font-size: 12px;
  background: #C0C0C0;
`

// Win98 按钮样式
export const Win98ButtonStyled = styled.button<{ pressed?: boolean; focused?: boolean }>`
  ${({ pressed }) => 
    pressed 
      ? css`
          background:
            url('/win98/assets/win98sm/button/n.png') repeat-x top,
            url('/win98/assets/win98sm/button/n.png') repeat-x bottom,
            url('/win98/assets/win98sm/button/n.png') repeat-y left,
            url('/win98/assets/win98sm/button/n.png') repeat-y right, 
            #C0C0C0;
        `
      : css`
          background:
            url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
            url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
            url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
            url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
            url('/win98/assets/win98sm/button/right.png') repeat-y right,
            url('/win98/assets/win98sm/button/top.png') repeat-x top,
            url('/win98/assets/win98sm/button/left.png') repeat-y left,
            url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
            #C0C0C0;
        `
  };
  
  font-size: 12px;
  padding: 3px;
  border: 1px solid black;
  display: inline-block;
  text-align: center;
  outline: none;
  cursor: pointer;
  font-family: 'MS Sans Serif', sans-serif;
  
  .inner-button {
    border: 1px dotted ${({ focused }) => focused ? 'black' : 'transparent'};
  }
  
  ${({ pressed }) => 
    pressed && css`
      .inner-button {
        border: 1px dotted black;
      }
    `
  }
`

// 菜单栏样式
export const Win98MenuBar = styled.div`
  width: 100%;
  background: #C0C0C0;
  border-bottom: 1px solid #808080;
  padding: 2px 0;
  font-size: 12px;
`

// 文本框样式
export const Win98TextBox = styled.input`
  border: 2px inset #C0C0C0;
  padding: 2px 4px;
  font-size: 12px;
  font-family: 'MS Sans Serif', sans-serif;
  background: white;
  
  &:focus {
    outline: none;
    border: 2px inset #0000FF;
  }
`

// 文本域样式
export const Win98TextArea = styled.textarea`
  border: 2px inset #C0C0C0;
  padding: 2px 4px;
  font-size: 12px;
  font-family: 'MS Sans Serif', sans-serif;
  background: white;
  resize: none;
  
  &:focus {
    outline: none;
    border: 2px inset #0000FF;
  }
`

// 面板样式
export const Win98Panel = styled.div<{ inset?: boolean }>`
  background: #C0C0C0;
  ${({ inset }) => 
    inset 
      ? css`
          border: 2px inset #C0C0C0;
        `
      : css`
          border: 2px outset #C0C0C0;
        `
  };
  padding: 8px;
`

// 分隔线
export const Win98Separator = styled.hr`
  border: none;
  height: 2px;
  background: linear-gradient(to right, #808080, #C0C0C0, #808080);
  margin: 4px 0;
`

// 滚动条样式（CSS自定义滚动条） - 完全方正的Win98风格
export const Win98ScrollArea = styled.div`
  overflow-y: auto;
  
  /* 自定义滚动条样式 - 完全方正，无圆角 */
  &::-webkit-scrollbar {
    width: 17px;
    background: #C0C0C0;
  }
  
  &::-webkit-scrollbar-track {
    background: #C0C0C0;
    border: 2px inset #C0C0C0;
    border-radius: 0; /* 完全去除圆角 */
  }
  
  &::-webkit-scrollbar-thumb {
    background: #C0C0C0;
    border: 2px outset #C0C0C0;
    border-radius: 0; /* 完全去除圆角 */
    min-height: 20px;
    
    &:hover {
      background: #E0E0E0;
      border: 2px outset #E0E0E0;
    }
    
    &:active {
      border: 2px inset #C0C0C0;
      background: #C0C0C0;
    }
  }
  
  &::-webkit-scrollbar-button {
    background: #C0C0C0;
    border: 2px outset #C0C0C0;
    border-radius: 0; /* 完全去除圆角 */
    height: 17px;
    width: 17px;
    
    &:hover {
      background: #E0E0E0;
      border: 2px outset #E0E0E0;
    }
    
    &:active {
      border: 2px inset #C0C0C0;
      background: #C0C0C0;
    }
  }
  
  /* 上箭头 */
  &::-webkit-scrollbar-button:vertical:start:decrement {
    background: #C0C0C0 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 1 L1 6 L7 6 Z" fill="black"/></svg>') center no-repeat;
  }
  
  /* 下箭头 */
  &::-webkit-scrollbar-button:vertical:end:increment {
    background: #C0C0C0 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 7 L1 2 L7 2 Z" fill="black"/></svg>') center no-repeat;
  }
  
  /* 角落 */
  &::-webkit-scrollbar-corner {
    background: #C0C0C0;
    border: 2px outset #C0C0C0;
    border-radius: 0;
  }
`
