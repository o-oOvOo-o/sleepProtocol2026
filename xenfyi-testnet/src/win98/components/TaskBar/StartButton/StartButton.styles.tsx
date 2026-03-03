import styled from '@emotion/styled'

// When trying to style component from the outside, use this instead of StartButtonStyled
export const StartButtonContainer = styled.div`
  height: 100%;
`

export const StartButtonStyled = styled.img<{ isPressed?: boolean }>`
  display: inline-block;
  width: 54px;
  height: 22px;
  margin: 4px 0 2px 2px;
  cursor: pointer;
`
