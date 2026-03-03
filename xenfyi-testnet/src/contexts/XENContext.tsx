import React, { createContext, useContext, ReactNode } from 'react';

// 临时的 XEN Context 实现，提供默认值以解决编译错误
interface XENContextType {
  userMint: any;
  globalRank: number;
}

const XENContext = createContext<XENContextType>({
  userMint: null,
  globalRank: 0,
});

interface XENProviderProps {
  children: ReactNode;
}

export const XENProvider: React.FC<XENProviderProps> = ({ children }) => {
  const value = {
    userMint: null,
    globalRank: 0,
  };

  return (
    <XENContext.Provider value={value}>
      {children}
    </XENContext.Provider>
  );
};

export default XENContext;
