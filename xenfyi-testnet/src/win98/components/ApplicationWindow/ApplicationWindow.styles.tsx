import { css } from '@emotion/react'
import styled from '@emotion/styled'

import mixins from '../../styles/mixins.styles'
import { ButtonStyled } from '../Button/Button.styles'
import { modalRootZindex } from '../ModalRoot/ModalRoot'

export const ApplicationWindowStyled = styled.div<{ isFocused: boolean; isMaximized?: boolean }>`
  ${mixins.standardBorderAlt};
  position: absolute;
  ${({ isMaximized }) => 
    isMaximized 
      ? css`
          top: 0;
          left: 0;
          right: 0;
          bottom: 32px; /* Leave space for taskbar */
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
  background-color: ${({ theme }) => theme.colors.baseGray};
  display: flex;
  flex-direction: column;
  ${({ isFocused }) =>
    isFocused
      ? css`
          z-index: ${modalRootZindex + 1};
        `
      : ''};
`

export const ApplicationWindowName = styled.span``

export const ApplicationWindowHeader = styled.div<{ isFocused: boolean }>`
  padding: 2px 3px;
  background-color: ${({ isFocused, theme }) =>
    isFocused ? theme.colors.darkBlue : theme.colors.darkGray};
  display: flex;
  align-items: center;
  cursor: default;
  user-select: none;
  
  &:hover {
    cursor: default;
  }

  > ${ApplicationWindowName} {
    font-size: 13px;
    color: ${({ isFocused, theme }) =>
      isFocused ? theme.colors.white : theme.colors.baseGray};
    margin-left: 3px;
  }

  > div > ${ButtonStyled} {
    padding: 1px 4px;
    margin-left: 1px;
    min-width: 16px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  > ${ButtonStyled}:first-of-type {
    margin-left: auto;
    padding: 2px;
  }
`
