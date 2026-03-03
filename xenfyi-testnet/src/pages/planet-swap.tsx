import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';

// 动画效果
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const PlanetSwapContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1a0e 0%, #1a3a1b 25%, #2d692d 50%, #1a3a1b 75%, #0a1a0e 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 20px;
  position: relative;
  overflow: hidden;

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(34, 139, 34, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(50, 205, 50, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(255, 69, 0, 0.05) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const PlanetIcon = styled.div`
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #FF4500 0%, #FF6347 50%, #FF8C00 100%);
  border-radius: 50%;
  margin-bottom: 40px;
  position: relative;
  animation: ${float} 4s ease-in-out infinite;
  box-shadow: 
    0 0 50px rgba(255, 69, 0, 0.3),
    inset 0 0 50px rgba(255, 140, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 30px;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: ${rotate} 20s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 30px;
    right: 40px;
    width: 25px;
    height: 25px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    animation: ${rotate} 15s linear infinite reverse;
  }
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF4500 0%, #FF6347 50%, #FF8C00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
  text-shadow: 0 0 30px rgba(255, 69, 0, 0.5);
  animation: ${pulse} 3s ease-in-out infinite;
`;

const Subtitle = styled.h2`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 30px;
  font-weight: 300;
  letter-spacing: 2px;
`;

const Description = styled.div`
  max-width: 800px;
  margin: 0 auto 40px;
  font-size: 18px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
  
  p {
    margin-bottom: 20px;
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin: 40px 0;
  max-width: 1000px;
  width: 100%;
`;

const FeatureCard = styled.div`
  background: linear-gradient(145deg, rgba(15, 35, 15, 0.9) 0%, rgba(25, 55, 25, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(34, 139, 34, 0.2);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 69, 0, 0.4);
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(255, 69, 0, 0.2);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  color: #FF6347;
  margin-bottom: 12px;
  font-weight: 600;
`;

const FeatureDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
`;

const BackButton = styled.button`
  background: linear-gradient(135deg, #228B22 0%, #32CD32 100%);
  border: none;
  border-radius: 50px;
  padding: 16px 32px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 40px;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(34, 139, 34, 0.4);
  }
`;

const ComingSoonBadge = styled.div`
  background: linear-gradient(135deg, #FF4500 0%, #FF6347 100%);
  color: white;
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 20px;
  display: inline-block;
  animation: ${pulse} 2s ease-in-out infinite;
`;

export default function PlanetSwapPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <>
      <Head>
        <title>行星泵 Swap - Sleep Protocol</title>
        <meta name="description" content="Revolutionary planetary pump swap mechanism - Coming Soon" />
      </Head>
      
      <PlanetSwapContainer>
        <ContentWrapper>
          <PlanetIcon />
          
          <ComingSoonBadge>开发中 • Coming Soon</ComingSoonBadge>
          
          <Title>行星泵 SWAP</Title>
          <Subtitle>Revolutionary Planetary Pump Mechanism</Subtitle>
          
          <Description>
            <p>
              行星泵Swap是Sleep Protocol即将推出的革命性交易机制，
              模拟行星引力泵送的物理现象，创造前所未有的流动性聚合体验。
            </p>
            <p>
              通过量子级别的价格发现算法和多维度流动性矩阵，
              为用户提供极致的交易效率和最小化的滑点损失。
            </p>
          </Description>

          <FeatureGrid>
            <FeatureCard>
              <FeatureTitle>引力聚合</FeatureTitle>
              <FeatureDescription>
                利用行星引力模型，自动聚合多个流动性池，
                实现最优价格发现和最小滑点交易。
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>量子路由</FeatureTitle>
              <FeatureDescription>
                采用量子计算启发的路由算法，
                在毫秒级别内找到最优交易路径。
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>时空套利</FeatureTitle>
              <FeatureDescription>
                跨时间维度的套利机制，
                利用价格时差创造额外收益机会。
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>崩塌保护</FeatureTitle>
              <FeatureDescription>
                内置市场崩塌保护机制，
                在极端市场条件下保护用户资产安全。
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>多维流动性</FeatureTitle>
              <FeatureDescription>
                整合传统AMM、订单簿和预言机价格，
                构建多维度流动性生态系统。
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>零知识验证</FeatureTitle>
              <FeatureDescription>
                采用零知识证明技术，
                保护交易隐私的同时确保透明度。
              </FeatureDescription>
            </FeatureCard>
          </FeatureGrid>

          <BackButton onClick={() => router.back()}>
            返回普通Swap
          </BackButton>
        </ContentWrapper>
      </PlanetSwapContainer>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}














