import styled from 'styled-components/macro';
import { Box } from 'rebass/styled-components';

const Card = styled(Box)<{ width?: string; padding?: string; border?: string; borderRadius?: string }>`
  width: ${({ width }) => width ?? '100%'};
  border-radius: 16px;
  padding: 1rem;
  padding: ${({ padding }) => padding};
  border: ${({ border }) => border};
  border-radius: ${({ borderRadius }) => borderRadius};
`
export default Card;

export const BlueOutlineCard = styled(Card)`
  border: 1px solid ${({theme}) => theme.blue2};
`

export const WhiteOutlineCard = styled(Card)`
  border: 1px solid ${({theme}) => theme.white1};
`