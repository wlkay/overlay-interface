import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { MarketCard } from "../../../components/Card/MarketCard";
import { 
  LightGreyButton, 
  TransparentUnderlineButton, 
  TransparentDarkGreyButton,
  ActiveBlueButton,
  TxnSettingsButton } from "../../../components/Button/Button";
import { TEXT } from "../../../theme/theme";
import { Column } from "../../../components/Column/Column";
import { Row } from "../../../components/Row/Row";
import { Label, Input } from '@rebass/forms';
import { usePositionActionHandlers } from '../../../state/position/hooks';
import { useActiveWeb3React } from '../../../hooks/web3';
import { usePositionState } from '../../../state/position/hooks';
import { useTokenBalance } from '../../../state/wallet/hooks';
import { PositionSide, DefaultTxnSettings } from '../../../state/position/actions';
import { OVL } from '../../../constants/tokens';
import { maxAmountSpend } from '../../../utils/maxAmountSpend';
import { useApproveCallback } from '../../../hooks/useApproveCallback';
import { useDerivedUserInputs } from '../../../state/position/hooks';
import { NumericalInput } from '../../../components/NumericalInput/NumericalInput';
import { LeverageSlider } from '../../../components/LeverageSlider/LeverageSlider';
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar';
import { Sliders, X } from 'react-feather';
import { Icon } from '../../../components/Icon/Icon';
import { InfoTip } from '../../../components/InfoTip/InfoTip';
import { useIsTxnSettingsAuto } from '../../../state/position/hooks';

export const LongPositionButton = styled(LightGreyButton)<{ active?: boolean }>`
  height: 48px;
  padding: 16px;
  margin: 4px 0;
  background: ${({ active }) => ( active ? '#10DCB1' : 'transparent' )};
  color: ${({ active }) => ( active ? '#F2F2F2' : '#10DCB1' )};
`;

export const ShortPositionButton = styled(LightGreyButton)<{ active?: boolean }>`
  height: 48px;
  padding: 16px;
  margin: 4px 0;
  background: ${({ active }) => ( active ? '#FF648A' : 'transparent' )};
  color: ${({ active }) => ( active ? '#F2F2F2' : '#FF648A' )};
`;

export const BuildButton = styled(LightGreyButton)`
  height: 48px;
  padding: 16px;
  margin: 4px 0;
  background: transparent;
  color: #71D2FF;
  margin-top: 24px;
`;

export const InputContainer = styled(Row)`
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid ${({theme}) => theme.white};
`;

export const InputDescriptor = styled.div`
  background: transparent;
  font-size: 16px;
  color: #f2f2f2;
  padding: 8px;
`;

export const AmountInput = styled(Input)`
  border-color: transparent !important;
`;

export const Detail = styled(Row)`
  margin: 12px 0;
  width: 100%;
  display: flex;
`;

export const Title = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #B9BABD;
`;

export const Content = styled.div<{ color?: string }>`
  margin-left: auto;
  flex-direction: row;
  display: flex;
  font-size: 14px;
  color: ${({ color }) => ( color ? color : '#B9BABD')};
`;

export const OI = styled.div`
  font-size: 14px;
  text-align: right;
  min-width: 130px;
  color: #B9BABD;
`;

const TransactionSettingModal = styled.div<{ isOpen?: boolean }>`
  display: ${({ isOpen }) => ( isOpen ? 'flex' : 'none' )};
  position: absolute;
  border: 1px solid #D0D0D2;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  backdrop-filter: blur(33px);
  z-index: 5;
  color: #f2f2f2;
`;


const AdditionalDetails = ({
  fee,
  slippage,
  estLiquidationPrice,
  bid,
  ask,
  expectedOi,
  oiLong,
  oiShort,
  fundingRate
}:{
  fee?: string | number
  slippage?: string | number
  estLiquidationPrice?: string | number
  bid?: string | number
  ask?: string | number
  expectedOi?: string | number
  oiLong?: number | undefined
  oiShort?: number | undefined
  fundingRate?: string | number
}) => {
  return (
    <Column mt={ '96px' } padding={'0 16px'}>
      <Detail>
        <Title> Fee </Title>
        <Content> {fee}% </Content>
      </Detail>

      <Detail>
        <Title> Slippage </Title>
        <Content> {slippage}% </Content>
      </Detail>

      <Detail>
        <Title> Est. Liquidation </Title>
        <Content> ${estLiquidationPrice} </Content>
      </Detail>

      <Detail>
        <Title> Bid </Title>
        <Content> ~${bid} </Content>
      </Detail>

      <Detail>
        <Title> Ask </Title>
        <Content> ~${ask} </Content>
      </Detail>

      <Detail>
        <Title> Expected OI </Title>
        <Content> {expectedOi} OVL </Content>
      </Detail>

      <Detail>
        <Title> OI Long </Title>
        <ProgressBar
          value={oiLong}
          max={200000}
          width={'75px'}
          color={'#10DCB1'}
          margin={'0 0 0 auto'}
          />
          
        <OI> {oiLong} / 200000 </OI>
      </Detail>

      <Detail>
        <Title> OI Short </Title>
        <ProgressBar
          value={oiShort}
          max={200000}
          width={'75px'}
          color={'#DC1F4E'}
          margin={'0 0 0 auto'}
          />

        <OI> {oiShort} / 200000 </OI>
      </Detail>

      <Detail>
        <Title> Funding rate </Title>
        <Content color={'#10DCB1'}> ~ {fundingRate}% </Content>
      </Detail>
    </Column>
  )
}

export const BuildPosition = ({
  marketName,
  marketPrice
}:{
  marketName: string 
  marketPrice: string | number
}) => {
  const [ isTxnSettingsOpen, setTxnSettingsOpen ] = useState(false);

  const isAuto = useIsTxnSettingsAuto();

  const { account, chainId } = useActiveWeb3React();

  const ovl = chainId ? OVL[chainId] : undefined;

  const userOvlBalance = useTokenBalance(account ?? undefined, ovl);

  const maxInputAmount = maxAmountSpend(userOvlBalance);

  const { 
    leverageValue, 
    positionSide, 
    inputValue, 
    inputCurrency, 
    slippageValue,
    txnDeadline } = usePositionState();

  const { 
    onAmountInput, 
    onLeverageInput, 
    onPositionSideInput, 
    onSlippageInput,
    onTxnDeadlineInput } = usePositionActionHandlers();


  const { parsedAmount, error } = useDerivedUserInputs(inputValue, ovl);

  // handle user inputs
  const handleResetTxnSettings = useCallback((e:any) => {
      onSlippageInput(DefaultTxnSettings.DEFAULT_SLIPPAGE);
      onTxnDeadlineInput(DefaultTxnSettings.DEFAULT_DEADLINE);
    }, [onSlippageInput, onTxnDeadlineInput]
  );

  const handleLeverageInput = useCallback((e: any) => { 
      onLeverageInput(e.target.value) 
    }, [onLeverageInput]
  );

  const handlePositionSideLong = useCallback(() => {
     onPositionSideInput(PositionSide.LONG) 
    }, [onPositionSideInput]
  );
  
  const handlePositionSideShort = useCallback(() => { 
     onPositionSideInput(PositionSide.SHORT)
    }, [onPositionSideInput]
  );
  
  const handleTypeInput = useCallback(
    (value: string) => {
      onAmountInput(value)
    }, [onAmountInput]
  );

  // handle quick inputs
  const handleMaxInput = useCallback(
    () => { 
      onAmountInput(maxInputAmount?.toExact());
    }, 
    [onAmountInput, maxInputAmount]
  );

  const handle75Input = useCallback(
    () => { 
      onAmountInput(maxInputAmount?.multiply(75).divide(100).toExact().toString()); 
    }, 
    [onAmountInput, maxInputAmount]
  );

  const handle50Input = useCallback(
    () => { 
      onAmountInput(maxInputAmount?.multiply(50).divide(100).toExact().toString()); 
    }, 
    [onAmountInput, maxInputAmount]
  );

  const handle25Input = useCallback(
    () => { 
      onAmountInput(maxInputAmount?.multiply(25).divide(100).toExact().toString()); 
    }, 
    [onAmountInput, maxInputAmount]
  );

  const [approval, approveCallback] = useApproveCallback(parsedAmount, inputCurrency);

  async function attemptToApprove() {
    if (!inputValue) throw new Error('missing position input size');
    if (!positionSide) throw new Error('please choose a long/short position');
    if (!leverageValue) throw new Error('please select a leverage value');

    await approveCallback();
  };

  return (
    <MarketCard align={'left'} padding={'0px'}>
      <Column 
          padding={'0 16px'}
          as={'form'} 
          onSubmit={(e:any) => e.preventDefault()}
          >

        <Row margin={'0 0 32px 0'}>
            <Column>
                <TEXT.MediumHeader 
                    fontWeight={700} 
                    color={'white'} 
                    margin={'14px 0 0 0'}
                    >
                      { marketName }
                </TEXT.MediumHeader>

                <TEXT.MediumHeader 
                    fontWeight={400} 
                    color={'white'}
                    >
                      { marketPrice }
                </TEXT.MediumHeader>
            </Column>
          <Icon 
            size={24} 
            margin={'0 0 auto auto'} 
            transform={'rotate(90deg)'} 
            clickable={true}
            top={'22px'}
            right={'12px'}
            position={'absolute'}
            onClick={() => setTxnSettingsOpen(!isTxnSettingsOpen)}
            >
              {isTxnSettingsOpen ? (
                <X color={'#12B4FF'}/>
                ):(
                  <Sliders color={'#B9BABD'}/>
                  )}
          </Icon>


        </Row>
        {/* Building out Transaction Settings below */}
          <TransactionSettingModal isOpen={ isTxnSettingsOpen }>
              <Column>
                  <TEXT.Body 
                      fontWeight={700} 
                      textAlign={'left'} 
                      margin={'24px auto 16px 16px'}
                      >
                        Transaction Settings
                  </TEXT.Body>

                  <Row padding={'8px 16px'}>
                      <TEXT.Menu>
                        Slippage Tolerance
                      </TEXT.Menu>

                      <InfoTip tipFor={'Slippage Tolerance'}>
                          <div>
                              meow meow meow
                          </div>
                      </InfoTip>
                  </Row>

                  <Row padding={'0px 16px 16px'}>
                      <InputContainer width={'210px'} height={'40px'}>
                          <NumericalInput 
                              value={slippageValue} 
                              onUserInput={onSlippageInput}
                              align={'right'}
                              />
                          <InputDescriptor>
                            %
                          </InputDescriptor>
                      </InputContainer>
                      <TxnSettingsButton 
                          active={isAuto}
                          onClick={handleResetTxnSettings}
                          width={'96px'} 
                          margin={'0 0 0 auto'}
                          padding={'0px'}
                          > 
                            Auto 
                      </TxnSettingsButton>
                  </Row>
                      
                  <Row padding={'8px 16px'}>
                      <TEXT.Menu>
                          Transaction Deadline
                      </TEXT.Menu>
                      <InfoTip tipFor={'Transaction Deadline'}>
                          <div>
                              meow meow woof
                          </div>
                      </InfoTip>
                  </Row>

                  <Row padding={'0px 16px 16px'}>
                      <InputContainer width={'210px'} height={'40px'}>
                            <NumericalInput 
                                value={txnDeadline} 
                                onUserInput={onTxnDeadlineInput}
                                align={'right'}
                                />
                            <InputDescriptor>
                                minutes
                            </InputDescriptor>
                      </InputContainer>
                  </Row>

                  <Row margin={'auto 0 0 0'} padding={'16px'} borderTop={'1px solid white'} >
                      <TxnSettingsButton 
                          onClick={handleResetTxnSettings}
                          border={'none'} 
                          width={'96px'}
                          margin={'0 auto 0 0'}
                          padding={'0px'}
                          > 
                            Reset
                      </TxnSettingsButton>
                      <TxnSettingsButton 
                          width={'96px'}
                          padding={'0px'}
                          > 
                            Save 
                      </TxnSettingsButton>
                  </Row>
              </Column>
          </TransactionSettingModal>
        {/* Building out Transaction Settings above */}

        <Column>
          <LongPositionButton
            onClick={ handlePositionSideLong }
            active={ positionSide === 'LONG' }
            >
              Long
          </LongPositionButton>

          <ShortPositionButton
            onClick={ handlePositionSideShort }
            active={ positionSide === 'SHORT' }
            >
              Short
          </ShortPositionButton>
        </Column>

        <LeverageSlider
          name={'leverage'}
          value={leverageValue}
          step={1}
          min={1}
          max={5}
          onChange={handleLeverageInput}
          margin={'24px 0 0 0'}
          />
        
        <Label htmlFor='Amount' mt={'24px'}>
          <TEXT.Body margin={'0 auto 4px 0'} color={'white'}>
            Amount
          </TEXT.Body>
          <Row 
            ml={'auto'} 
            mb={'4px'} 
            width={'auto'}
            >
            <TransparentUnderlineButton 
                border={'none'} 
                onClick={handle25Input}
                >
                  25%
            </TransparentUnderlineButton>
            <TransparentUnderlineButton 
                border={'none'} 
                onClick={handle50Input}
                >
                  50%
            </TransparentUnderlineButton>
            <TransparentUnderlineButton
                border={'none'} 
                onClick={handle75Input}
                >
                  75%
            </TransparentUnderlineButton>
            <TransparentUnderlineButton 
                border={'none'} 
                onClick={handleMaxInput}
                >
                  Max
            </TransparentUnderlineButton>
          </Row>
        </Label>
        <InputContainer>
          <InputDescriptor>
            OVL
          </InputDescriptor>
          <NumericalInput 
            value={inputValue?.toString()}
            onUserInput={handleTypeInput}
            align={'right'}
            />
        </InputContainer>
        <BuildButton>
          Build
        </BuildButton>

      </Column>

      <AdditionalDetails 
        fee={'0.0'}
        slippage={'0'}
        estLiquidationPrice={'0.00'}
        bid={'2241.25'}
        ask={'2241.25'}
        expectedOi={'0'}
        oiLong={90000}
        oiShort={15000}
        fundingRate={'-0.0026'}
        />
    </MarketCard>
  )
};