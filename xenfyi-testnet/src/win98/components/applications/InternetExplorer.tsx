import React, { useState } from 'react';
import styled from '@emotion/styled';

interface InternetExplorerProps {
  onClose?: () => void;
  initialUrl?: string;
}

const InternetExplorer: React.FC<InternetExplorerProps> = ({ 
  onClose, 
  initialUrl = 'https://google.com' 
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  const handleNavigate = () => {
    setCurrentUrl(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <Container>
      <AddressBar>
        <Label>Address:</Label>
        <UrlInput
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter URL..."
        />
        <GoButton onClick={handleNavigate}>Go</GoButton>
      </AddressBar>
      <iframe
        src={currentUrl}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="Internet Explorer"
      />
    </Container>
  );
};

const Container = styled.div`
  height: 100%;
  width: 100%;
  background: #c0c0c0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const AddressBar = styled.div`
  display: flex;
  align-items: center;
  padding: 4px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
  font-size: 11px;
  font-family: 'MS Sans Serif', sans-serif;
`;

const Label = styled.span`
  margin-right: 4px;
  font-size: 11px;
`;

const UrlInput = styled.input`
  flex-grow: 1;
  padding: 2px 4px;
  border: 2px inset #c0c0c0;
  background: white;
  font-size: 11px;
  font-family: 'MS Sans Serif', sans-serif;
  
  &:focus {
    outline: 1px dotted #000;
  }
`;

const GoButton = styled.button`
  margin-left: 4px;
  padding: 2px 8px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  cursor: pointer;
  font-size: 11px;
  font-family: 'MS Sans Serif', sans-serif;

  &:active {
    border: 2px inset #c0c0c0;
  }

  &:hover {
    background: #d4d0c8;
  }
`;

export default InternetExplorer;
