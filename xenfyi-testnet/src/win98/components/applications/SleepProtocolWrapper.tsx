import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the modular sleep protocol app
const SleepProtocol = dynamic(
  () => import('./SleepProtocol'),
  { ssr: false }
);

interface SleepProtocolWrapperProps {
  onClose?: () => void;
}

const SleepProtocolWrapper: React.FC<SleepProtocolWrapperProps> = ({ onClose }) => {
  return <SleepProtocol onClose={onClose} />;
};

export default SleepProtocolWrapper;
