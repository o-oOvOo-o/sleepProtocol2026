import { css } from '@emotion/react'
import styled from '@emotion/styled'

import { theme } from '../../../styles/theme'

export const TaskEntryStyled = styled.div<{ isPushed?: boolean; isFocused?: boolean }>`
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  margin: 0 3px 3px 0;
  height: 22px;
  width: 160px;
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  
  /* 默认状态 - 普通按钮样式 */
  background:
    url('/win98/assets/win98sm/images/button/topright.png') no-repeat right top,
    url('/win98/assets/win98sm/images/button/topleft.png') no-repeat left top,
    url('/win98/assets/win98sm/images/button/bottomright.png') no-repeat right bottom,
    url('/win98/assets/win98sm/images/button/bottomleft.png') no-repeat left bottom,
    url('/win98/assets/win98sm/images/button/right.png') repeat-y right,
    url('/win98/assets/win98sm/images/button/top.png') repeat-x top,
    url('/win98/assets/win98sm/images/button/left.png') repeat-y left,
    url('/win98/assets/win98sm/images/button/bottom.png') repeat-x bottom, #C0C0C0;

  ${({ isFocused }) =>
    isFocused
      ? css`
          /* 聚焦状态 - 特殊的任务栏按钮样式 */
          background:
            url('/win98/assets/win98sm/images/tb/tb-ur.png') no-repeat right top,
            url('/win98/assets/win98sm/images/tb/tb-ul.png') no-repeat left top,
            url('/win98/assets/win98sm/images/tb/tb-br.png') no-repeat right bottom,
            url('/win98/assets/win98sm/images/tb/tb-bl.png') no-repeat left bottom,
            url('/win98/assets/win98sm/images/tb/tb-r.png') repeat-y right,
            url('/win98/assets/win98sm/images/tb/tb-u.png') repeat-x top,
            url('/win98/assets/win98sm/images/tb/tb-l.png') repeat-y left,
            url('/win98/assets/win98sm/images/tb/tb-b.png') repeat-x bottom,
            url('/win98/assets/win98sm/images/tb/tb-d.png') repeat;
          
          span {
            font-weight: bolder;
          }
          
          img {
            margin-top: 4px;
          }
        `
      : ''};

  ${({ isPushed }) =>
    isPushed
      ? css`
          /* 按下状态 */
          background:
            url('/win98/assets/win98sm/images/tb/ptb-tr.png') no-repeat right top,
            url('/win98/assets/win98sm/images/tb/ptb-tl.png') no-repeat left top,
            url('/win98/assets/win98sm/images/tb/ptb-br.png') no-repeat right bottom,
            url('/win98/assets/win98sm/images/tb/ptb-bl.png') no-repeat left bottom,
            url('/win98/assets/win98sm/images/tb/ptb-r.png') repeat-y right,
            url('/win98/assets/win98sm/images/tb/ptb-t.png') repeat-x top,
            url('/win98/assets/win98sm/images/tb/ptb-l.png') repeat-y left,
            url('/win98/assets/win98sm/images/tb/ptb-b.png') repeat-x bottom, #C0C0C0;
        `
      : ''};

  span, img {
    float: left;
    margin: 3px 0 3px 3px;
  }

  span {
    margin-left: 3px;
  }

  :focus {
    outline: none;
  }
`
