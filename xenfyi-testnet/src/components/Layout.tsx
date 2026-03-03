import { Toaster } from "react-hot-toast";
import { useTranslation } from "next-i18next";

import Meta from "~/components/Meta";
import { BottomNav } from "~/components/nav/BottomNav";
import { Navbar } from "~/components/nav/Navbar";

const Layout = ({ children }: any) => {
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Global Sleep Protocol Background */}
      <div className="fixed inset-0 z-0">
        {/* Deep Night Sky Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950"></div>
        
        {/* Animated Aurora Effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/15 via-transparent to-purple-500/15 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-l from-indigo-500/10 via-transparent to-blue-500/10 animate-pulse delay-1000"></div>
        </div>
        
        {/* Floating Dream Orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-bounce delay-300"></div>
        <div className="absolute top-20 right-20 w-24 h-24 bg-purple-400/15 rounded-full blur-xl animate-bounce delay-700"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-indigo-400/15 rounded-full blur-3xl animate-bounce delay-1100"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-blue-300/20 rounded-full blur-xl animate-bounce delay-1500"></div>
        <div className="absolute top-1/3 left-1/2 w-36 h-36 bg-purple-300/15 rounded-full blur-2xl animate-bounce delay-500"></div>
        
        {/* Twinkling Stars Field */}
        <div className="absolute top-16 left-16 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-200"></div>
        <div className="absolute top-24 right-32 w-0.5 h-0.5 bg-purple-200 rounded-full animate-pulse delay-600"></div>
        <div className="absolute top-40 left-1/3 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-60 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-400"></div>
        <div className="absolute bottom-60 left-20 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse delay-800"></div>
        <div className="absolute bottom-40 right-16 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse delay-1200"></div>
        <div className="absolute bottom-80 left-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-300"></div>
        <div className="absolute top-1/2 right-12 w-0.5 h-0.5 bg-purple-200 rounded-full animate-pulse delay-900"></div>
        <div className="absolute top-32 left-3/4 w-1 h-1 bg-indigo-200 rounded-full animate-pulse delay-1400"></div>
        <div className="absolute bottom-1/3 right-1/2 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse delay-700"></div>
        
        {/* Dreamy Clouds */}
        <div className="absolute top-1/4 left-0 w-64 h-32 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute top-3/4 right-0 w-48 h-24 bg-gradient-to-l from-transparent via-indigo-800/5 to-transparent rounded-full blur-xl animate-pulse delay-2500"></div>
        <div className="absolute bottom-1/2 left-1/4 w-56 h-28 bg-gradient-to-r from-transparent via-purple-800/5 to-transparent rounded-full blur-xl animate-pulse delay-3000"></div>
        
        {/* Moon Glow */}
        <div className="absolute top-8 right-8 w-20 h-20 bg-gradient-to-br from-blue-200/30 to-indigo-200/20 rounded-full blur-lg animate-pulse delay-100"></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-3" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(147,197,253,0.2) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Content with proper z-index */}
      <div className="relative z-10 pb-24 lg:pb-0">
        <Meta />
        <Navbar />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
          }}
        />
        <BottomNav />
      </div>
    </div>
  );
};

export default Layout;
