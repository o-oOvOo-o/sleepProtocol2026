import styled from '@emotion/styled'
import React from 'react'

const radioButtonCheckedImage = '/win98/assets/icons/radio-button-checked.png'
const radioButtonUncheckedImage = '/win98/assets/icons/radio-button-unchecked.png'
import mixins from '../../styles/mixins.styles'

interface Props {
  id: string
  name: string
  value: string | number
  checked?: boolean
  onChange?: (checked: boolean) => void
  autoFocus?: boolean

  children?: React.ReactNode
}

export const RadioButtonStyled = styled.div`
  display: flex;
  align-items: center;
`

const RadioLabel = styled.label`
  margin-left: 4px;
`

const RadioInput = styled.input`
  width: 12px;
  height: 12px;

  background-image: url(${radioButtonUncheckedImage});
  background-repeat: no-repeat;
  background-position: center;

  image-rendering: pixelated;

  :checked {
    background-image: url(${radioButtonCheckedImage});
  }

  &:focus + ${RadioLabel} {
    ${mixins.dottedBorderBlack};
  }
`

export const RadioButton: React.FC<Props> = ({
  id,
  name,
  value,
  children,
  checked,
  onChange,
  autoFocus,
}) => {
  return (
    <RadioButtonStyled>
      <RadioInput
        id={id}
        name={name}
        type={'radio'}
        value={value}
        checked={checked}
        onChange={onChange && ((event) => onChange(event.target.checked))}
        autoFocus={autoFocus}
      />
      <RadioLabel htmlFor={id}>{children}</RadioLabel>
    </RadioButtonStyled>
  )
}
