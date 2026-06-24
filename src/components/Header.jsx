import React, { useState, useEffect, useRef } from 'react';

const Header = ({ onAnalyzeClick, isAnalyzing, isOnEditor, onGetStarted }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasLoaded(true);
    }, 100);

    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 50) {
          if (currentScrollY > lastScrollY.current && currentScrollY - lastScrollY.current > 5) {
            setIsVisible(false);
          } else if (lastScrollY.current - currentScrollY > 5) {
            setIsVisible(true);
          }
        } else {
          setIsVisible(true);
        }

        lastScrollY.current = currentScrollY;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar, { passive: true });

      return () => {
        window.removeEventListener('scroll', controlNavbar);
        clearTimeout(timer);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  return (
    <nav
      className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 sm:-translate-y-24 opacity-0'
      } ${hasLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{
        transition: hasLoaded ? 'all 0.5s ease-out' : 'opacity 0.8s ease-out, transform 0.8s ease-out',
      }}
    >
      {/* Main Navigation */}
      <div className="w-[95vw] sm:w-[90vw] max-w-5xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/15 rounded-full px-4 py-2.5 sm:px-6 sm:py-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="flex items-center justify-between gap-4">
            {/* Logo/Branding */}
            <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-white rounded-xl shadow-lg">
                <span className="text-blue-500 font-bold text-base sm:text-lg">🛡️</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm sm:text-base md:text-lg leading-none">CodeGuard AI</span>
                <span className="text-gray-400 text-[9px] sm:text-[10px] md:text-xs mt-0.5 leading-none">AI-Powered Analysis</span>
              </div>
            </div>

            {/* Action Button - Always inline */}
            <div>
              {!isOnEditor ? (
                <button
                  onClick={onGetStarted}
                  className="relative bg-white hover:bg-gray-50 text-black font-semibold px-4 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm md:text-base flex items-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group"
                >
                  <span className="mr-1 sm:mr-2">Get Started</span>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={onAnalyzeClick}
                  disabled={isAnalyzing}
                  className={`relative font-semibold px-4 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm md:text-base flex items-center transition-all duration-300 cursor-pointer group ${
                    isAnalyzing
                      ? 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 text-black hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <span className="mr-1 sm:mr-2">{isAnalyzing ? '⏳ Analyzing...' : '▶ Analyze'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
