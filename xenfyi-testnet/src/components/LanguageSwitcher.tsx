import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { GlobeIcon } from '@heroicons/react/outline';

const LanguageSwitcher = () => {
  const router = useRouter();

  const changeLanguage = (lng: string) => {
    router.push(router.pathname, router.asPath, { locale: lng });
  };

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-ghost btn-circle">
        <GlobeIcon className="w-5 h-5" />
      </label>
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
        <li>
          <button onClick={() => changeLanguage('en')}>English</button>
        </li>
        <li>
          <button onClick={() => changeLanguage('zh')}>中文</button>
        </li>
        <li>
          <button onClick={() => changeLanguage('ko')}>한국어</button>
        </li>
        <li>
          <button onClick={() => changeLanguage('ja')}>日本語</button>
        </li>
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
