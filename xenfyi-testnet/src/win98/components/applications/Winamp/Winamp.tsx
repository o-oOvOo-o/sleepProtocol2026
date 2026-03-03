import React, { useEffect, useRef } from 'react';
import Webamp from 'webamp';
import { initialTracks } from './config';

interface WinampProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

const Winamp: React.FC<WinampProps> = ({ onClose, onMinimize }) => {
  const ref = useRef<HTMLDivElement>(null);
  const webamp = useRef<any>(null);
  const isCleanedUp = useRef(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    webamp.current = new Webamp({
      initialTracks,
      // 禁用一些可能与我们的窗口系统冲突的功能
      enableHotkeys: false,
      availableSkins: [
        {
          url: "https://raw.githubusercontent.com/captbaritone/webamp-music/master/skins/base-2.91.wsz",
          name: "Base v2.91"
        }
      ]
    });

    let webampElement: Element | null = null;

    webamp.current.renderWhenReady(target).then(() => {
      // Webamp会创建自己的DOM结构
      webampElement = document.querySelector('#webamp');
      if (webampElement && target) {
        target.appendChild(webampElement);
        
        // 确保Winamp不会干扰其他窗口的点击事件
        (webampElement as HTMLElement).style.pointerEvents = 'auto';
      }
    });

    return () => {
      if (webamp.current && !isCleanedUp.current) {
        isCleanedUp.current = true;
        
        try {
          // 手动清理DOM元素
          const webampElements = document.querySelectorAll('#webamp');
          webampElements.forEach((element) => {
            try {
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            } catch (e) {
              // 忽略移除错误
            }
          });
          
          // 清空容器
          if (target) {
            target.innerHTML = '';
          }
          
          // 尝试调用dispose，但如果失败就忽略
          try {
            webamp.current.dispose();
          } catch (disposeError) {
            // dispose失败是常见的，忽略这个错误
            console.log('Webamp dispose skipped due to DOM state');
          }
          
        } catch (error) {
          console.warn('Webamp cleanup error:', error);
        } finally {
          webamp.current = null;
        }
      }
    };
  }, []);

  useEffect(() => {
    if (webamp.current) {
      if (onClose) {
        webamp.current.onClose(onClose);
      }
      if (onMinimize) {
        webamp.current.onMinimize(onMinimize);
      }
    }
  }, [onClose, onMinimize]);

  return (
    <div
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: '275px',
        minHeight: '116px'
      }}
      ref={ref}
    />
  );
};

export default Winamp;
