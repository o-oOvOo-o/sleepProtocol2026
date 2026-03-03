import {
  BookOpenIcon,
  CubeTransparentIcon,
  DotsVerticalIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/outline';
import { clsx } from 'clsx';
import { ConnectKitButton } from 'connectkit';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useTheme } from 'next-themes';
import { isMobile } from 'react-device-detect';
import { useAccount, useChainId } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { useEffect, useState } from 'react';

import { linkItems, navigationItems } from '~/components/Constants';
import { useSleepContext } from '~/contexts/SleepContext';
import { WalletIcon } from '../Icons';
import {
  DesktopComputerIcon,
  GlobeIcon,
  InformationCircleIcon,
  CodeIcon,
} from '@heroicons/react/outline';
import Image from 'next/image';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import { NetworkSwitcher } from '~/components/NetworkSwitcher';

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export const Navbar: NextPage = () => {
  const { t } = useTranslation('common');
  const { address } = useAccount();
  const router = useRouter();
  const { token, currentChain, setChainOverride } = useSleepContext();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { connector } = useAccount();
  const isMounted = useIsMounted();

  return (
    <div className="navbar bg-slate-900/80 backdrop-blur-xl border-b border-blue-500/20 sticky top-0 z-50 text-slate-200">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-2xl bg-slate-800/95 backdrop-blur-xl border border-blue-400/30 rounded-box w-52"
          >
            {navigationItems.map((item, i) => (
              <li key={i} className={clsx({ disabled: isMounted && item.canDisable && !address })}>
                <Link href={item.href}>
                  {item.icon}
                  {t(item.t)}
                </Link>
              </li>
            ))}
            <li className="mt-2 pt-2 border-t border-blue-400/30">
              <div className="p-2">
                <NetworkSwitcher variant="modern" />
              </div>
            </li>
          </ul>
        </div>
        <Link href="/app/dashboard" className="btn btn-ghost normal-case text-xl hidden md:flex">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="mr-2" />
          Sleep Coin
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal p-0">
          {navigationItems.map((item, i) => (
            <li key={i} className={clsx({ disabled: isMounted && item.canDisable && !address })}>
              <Link href={item.href}>
                {item.icon}
                {t(item.t)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-4">
          <NetworkSwitcher variant="modern" />
        </div>
      </div>
      <div className="navbar-end space-x-2">
        <ConnectKitButton />
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost">
            <DotsVerticalIcon className="h-5 w-5" />
          </label>
          <ul
            tabIndex={0}
            className="mt-3 p-2 shadow menu menu-compact dropdown-content bg-base-200 rounded-box w-72 space-y-2"
          >
            <li>
              <div className="flex flex-row justify-between">
                {t('settings.theme')}
                <button
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                >
                  {isDark ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </li>
            <li>
              <LanguageSwitcher />
            </li>
            <li>
              <Link href="/app/dev" className="justify-between">
                Developer Panel
                <CodeIcon className="w-5 h-5" />
              </Link>
            </li>
            <div className="divider my-0"></div>
            <li>
              <button
                className="justify-between"
                onClick={() => {
                  (connector as InjectedConnector)?.watchAsset?.({
                    address: '0xPLACEHOLDER_ADDRESS',
                    decimals: 18,
                    symbol: 'SLEEPING',
                  });
                }}
              >
                {t('add-to-wallet')}
                <WalletIcon />
              </button>
            </li>
            {linkItems.map((item, index) => (
              <li key={index}>
                <a href={item.href} target="_blank" rel="noreferrer" className="justify-between">
                  {t(item.t)}
                  {item.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
