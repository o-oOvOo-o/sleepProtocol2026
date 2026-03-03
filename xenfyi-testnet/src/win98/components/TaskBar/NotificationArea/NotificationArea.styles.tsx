import styled from '@emotion/styled'

import { IconStyled } from '../../Icon/Icon.styles'
import { VolumeControlStyled } from '../VolumeControl/VolumeControl.styles'

// TODO extract border styles this as mixin or component
export const NotificationAreaStyled = styled.div`
  position: absolute;
  right: 2px;
  top: 4px;
  text-align: center;
  height: 20px;
  padding: 0 10px;
  border-top: 1px solid #808080;
  border-left: 1px solid #808080;
  border-right: 1px solid white;
  border-bottom: 1px solid white;
  display: flex;
  align-items: center;

  ${VolumeControlStyled} {
    right: 50px;
  }
`

export const NotificationAreaIconSection = styled.div`
  height: 100%;
  display: flex;
  > ${IconStyled} {
    margin-left: 1px;

    &:first-of-type {
      margin-left: 0;
    }
  }
`

export const NotificationAreaTime = styled.time`
  line-height: 20px;
  font-size: 12px;
  margin-left: 8px;
`
