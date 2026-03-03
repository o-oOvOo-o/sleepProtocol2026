import {
  BookOpenIcon,
  CashIcon,
  DesktopComputerIcon,
  GlobeIcon,
  InformationCircleIcon,
  LockClosedIcon,
  ViewGridIcon,
  UserIcon,
  DocumentTextIcon,
  CubeTransparentIcon, // placeholder
  ShoppingCartIcon,
  TicketIcon,
} from '@heroicons/react/outline';
/*
import {
  DiamondIcon,
  TwitterIcon,
  TelegramIcon,
  DiscordIcon,
  GitHubIcon,
  CoinmarketCapIcon,
  DuneIcon,
} from '~/components/Icons';
*/

export const navigationItems = [
  {
    id: 0,
    t: 'dashboard.title',
    icon: <ViewGridIcon className="h-5 w-5" />,
    href: '/app/dashboard',
    canDisable: false,
  },
  {
    id: 1,
    t: 'access-pass.title',
    icon: <TicketIcon className="h-5 w-5" />,
    href: '/app/access-pass',
    canDisable: false,
  },
  {
    id: 2,
    t: 'mint.title',
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <DiamondIcon />,
    href: '/app/mint/1',
    canDisable: true,
  },
  {
    id: 3,
    t: 'stake.title',
    icon: <LockClosedIcon className="h-5 w-5" />,
    href: '/app/stake',
    canDisable: true,
  },
  {
    id: 4,
    t: 'common.litepaper',
    icon: <BookOpenIcon className="h-5 w-5" />,
    href: '/app/litepaper',
    canDisable: false,
  },
  {
    id: 5,
    t: 'profile.title',
    icon: <UserIcon className="h-5 w-5" />,
    href: '/app/profile',
    canDisable: false,
  },
  {
    id: 6,
    t: 'liquidate.title',
    icon: <CashIcon className="h-5 w-5" />,
    href: '/app/liquidate',
    canDisable: false,
  },
  {
    id: 7,
    t: 'market.title',
    icon: <ShoppingCartIcon className="h-5 w-5" />,
    href: '/app/market',
    canDisable: false,
  },
];

export const textLinkItems = [
  {
    name: "Developer",
    t: "link.developer",
    href: "http://twitter.com/joeblau",
  },

  {
    name: "Website Source Code",
    t: "link.website-source-code",
    href: "https://github.com/atomizexyz/xenfyi",
  },
];

export const linkItems = [
  {
    name: "Whitepaper",
    t: "link.whitepaper",
    icon: <DocumentTextIcon className="h-5 w-5" />,
    href: "https://faircrypto.org/xencryptolp.pdf",
  },
  {
    name: "Docs",
    t: "link.docs",
    icon: <BookOpenIcon className="h-5 w-5" />,
    href: "https://xensource.gitbook.io/www.xenpedia.io/",
  },
  {
    name: "Twitter",
    t: "link.twitter",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <TwitterIcon />,
    href: "https://twitter.com/XEN_Crypto",
  },
  {
    name: "Telegram",
    t: "link.telegram",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <TelegramIcon />,
    href: "https://t.me/XENCryptoTalk",
  },
  {
    name: "Discord",
    t: "link.discord",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <DiscordIcon />,
    href: "https://discord.gg/rcAhrKWJb6",
  },
  {
    name: "GitHub",
    t: "link.github",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <GitHubIcon />,
    href: "https://github.com/FairCrypto",
  },
  {
    name: "CoinMarketCap",
    t: "link.coinmarketcap",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <CoinmarketCapIcon />,
    href: "https://coinmarketcap.com/currencies/xen-crypto/",
  },
  {
    name: "Dune Analytics",
    t: "link.dune",
    icon: <CubeTransparentIcon className="h-5 w-5" />, // <DuneIcon />,
    href: "https://dune.com/sixdegree/xen-crypto-overview",
  },
];
