// 共享类型定义

export interface MintForm {
  count: number;
  term: number;
}

export interface StakeForm {
  amount: number;
}

export interface ElementTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ElementTransforms {
  avatar: ElementTransform;
  logo: ElementTransform;
  chip: ElementTransform;
  cardholderInfo: ElementTransform;
  accountBalance: ElementTransform;
  claimableInfo: ElementTransform;
  devSupport: ElementTransform;
  devSupportInfo: ElementTransform;
  badge: ElementTransform;
  bottomText: ElementTransform;
  countryFlag: ElementTransform;
}

export interface AccessPassDesign {
  // 背景层
  bgColor1: string;
  bgColor2: string;
  bgGradientDirection: number;
  patternType: number;
  patternColor: string;
  patternOpacity: number;
  
  // 内容层 - 头像设计器
  avatarFaceType: number;
  avatarEyeType: number;
  avatarMouthType: number;
  avatarHairType: number;
  avatarSkinColor: string;
  avatarAccessory: number;
  fontChoice: number;
  textColor: string;

  // 徽章层
  badgeType: number;
  
  // 国家层
  countryCode: string;
  showCountryFlag: boolean;
}

