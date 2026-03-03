import styled from '@emotion/styled'

import { SeparatorStyled } from '../Separator/Separator'

import { NotificationAreaStyled } from './NotificationArea/NotificationArea.styles'

export const TaskBarStyled = styled.div`
  position: fixed;
  bottom: 0px;
  width: 100%;
  height: 28px;
  background: url('/win98/assets/win98sm/images/startmenu/bar2.png') repeat-x top, #C0C0C0;
  z-index: 5000000;
  display: flex;
  align-items: center;
  padding: 0;
  margin: 0;

  > ${SeparatorStyled} {
    margin-left: 2px;

    &:nth-last-of-type(2) {
      margin-left: auto;
    }
  }

  > ${NotificationAreaStyled} {
    margin-left: 2px;
  }
`

export const TaskBarMainToolbar = styled.div`
  position: fixed;
  display: inline-block;
  bottom: -8px;
  left: 60px;
  width: calc(100% - 155px);
  height: 32px;
`

export const TaskBarSeparator = styled.div`
  position: absolute;
  right: 90px;
  top: 4px;
  width: 0px;
  height: 22px;
  border-right: 1px solid white;
  border-left: 1px solid #87888F;
`
