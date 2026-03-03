// 共享工具函数

export const safeBigIntConversion = (value: any): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(Math.floor(value));
  }
  if (typeof value === 'string') {
    const numStr = value.replace(/[^\d]/g, '');
    return numStr ? BigInt(numStr) : BigInt(0);
  }
  // 对于对象类型，尝试访问常见属性
  if (value && typeof value === 'object') {
    if ('value' in value && value.value !== undefined) {
      return safeBigIntConversion(value.value);
    }
    if ('_hex' in value && typeof value._hex === 'string') {
      try {
        return BigInt(value._hex);
      } catch (error) {
        console.warn('Failed to convert hex value to BigInt:', value._hex);
        return BigInt(0);
      }
    }
  }
  return BigInt(0);
};

export const safeFormatBalance = (balance: any, decimals: number = 18): string => {
  try {
    if (!balance) return '0';
    
    if (balance.value !== undefined) {
      return formatUnits(safeBigIntConversion(balance.value), decimals);
    }
    
    if (typeof balance === 'bigint' || typeof balance === 'number') {
      return formatUnits(safeBigIntConversion(balance), decimals);
    }
    
    if (typeof balance === 'string' && /^\d+$/.test(balance)) {
      return formatUnits(BigInt(balance), decimals);
    }
    
    const bigIntValue = safeBigIntConversion(balance);
    return formatUnits(bigIntValue, decimals);
  } catch (error) {
    console.warn('Error formatting balance:', error, balance);
    return '0';
  }
};

export const ensureArray = <T,>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export const formatAmountForSvg = (amount: number, decimals: number): string => {
  if (amount === 0) return "0.00";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toFixed(decimals);
};

export const calculateContributionPercent = (userAmount: number, totalAmount: number): string => {
  if (totalAmount === 0 || userAmount === 0) return "0.00";
  const percentage = (userAmount / totalAmount) * 100;
  return percentage.toFixed(2);
};

// 需要导入formatUnits
import { formatUnits } from 'viem';

