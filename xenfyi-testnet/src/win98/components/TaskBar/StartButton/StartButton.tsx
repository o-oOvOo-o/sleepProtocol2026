import React from 'react'

import {
  clickOutsideWrapper,
  ClickOutsideWrapperProps,
} from '../../../hocs/clickOutsideWrapper'
import StartMenu from '../StartMenu/StartMenu'

import {
  StartButtonContainer,
  StartButtonStyled,
} from './StartButton.styles'

const StartButton: React.FC<ClickOutsideWrapperProps> = ({
  isOpen,
  toggleIsOpen,
  wrapperRef,
}) => {
  return (
    <StartButtonContainer ref={wrapperRef}>
      {isOpen && <StartMenu closeMenu={toggleIsOpen} />}
      <StartButtonStyled 
        isPressed={isOpen} 
        onClick={toggleIsOpen}
        alt="Start"
        title="Click here to start."
        src={isOpen 
          ? '/win98/assets/win98sm/images/startmenu/on.png' 
          : '/win98/assets/win98sm/images/startmenu/off.png'}
      />
    </StartButtonContainer>
  )
}

export default clickOutsideWrapper(StartButton)
