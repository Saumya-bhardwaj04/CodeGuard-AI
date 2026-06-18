import React, { useState, useEffect, useRef } from 'react';

const Header = ({ onLanguageChange, selectedLanguage, onAnalyzeClick, isAnalyzing, isOnEditor, onGetStarted }) => {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      <nav
        className={`fixed top-4 md:top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 md:-translate-y-24 opacity-0'
        } ${hasLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          transition: hasLoaded ? 'all 0.5s ease-out' : 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        {/* Main Navigation */}
        <div className="w-[90vw] max-w-xs md:max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 md:px-6 md:py-2">
            <div className="flex items-center justify-between gap-4 md:gap-0">
              {/* Logo/Branding */}
              <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-lg shadow-lg">
                  <span className="text-blue-500 font-bold text-lg md:text-xl">🛡️</span>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-white font-bold text-base md:text-lg leading-tight">CodeGuard AI</span>
                  <span className="text-gray-400 text-[10px] md:text-xs leading-tight">AI-Powered Analysis</span>
                </div>
              </div>

              {/* Desktop Navigation */}
              {isOnEditor && (
                <div className="hidden md:flex items-center space-x-2">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white/80 text-sm md:text-base px-4 py-2 pr-8 rounded-full hover:border-white/40 focus:outline-none focus:border-white/60 transition-all duration-200 cursor-pointer"
                  >
                    <option value="java" className="bg-gray-900">Java</option>
                    <option value="python" className="bg-gray-900">Python</option>
                    <option value="javascript" className="bg-gray-900">JavaScript</option>
                  </select>
                </div>
              )}

              {/* Desktop CTA/Analyze Button */}
              <div className="hidden md:block">
                {!isOnEditor ? (
                  <button
                    onClick={onGetStarted}
                    className="relative bg-white hover:bg-gray-50 text-black font-medium px-6 py-2 rounded-full flex items-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group"
                  >
                    <span className="mr-2">Get Started</span>
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={onAnalyzeClick}
                    disabled={isAnalyzing}
                    className={`relative font-medium px-6 py-2 rounded-full flex items-center transition-all duration-300 cursor-pointer group ${
                      isAnalyzing
                        ? 'bg-gray-500/30 text-white/50 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-black hover:scale-105 hover:shadow-lg'
                    }`}
                  >
                    <span className="mr-2">{isAnalyzing ? '⏳ Analyzing...' : '▶ Analyze'}</span>
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden text-white hover:scale-110 transition-transform duration-200 cursor-pointer"
              >
                <div className="relative w-6 h-6">
                  <svg
                    className={`absolute inset-0 transition-all duration-300 w-6 h-6 ${
                      isOpen ? 'opacity-0 rotate-180 scale-75' : 'opacity-100 rotate-0 scale-100'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg
                    className={`absolute inset-0 transition-all duration-300 w-6 h-6 ${
                      isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-75'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden relative">
          {/* Backdrop overlay */}
          <div
            className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300 ${
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsOpen(false)}
            style={{ top: '0', left: '0', right: '0', bottom: '0', zIndex: -1 }}
          />

          {/* Menu container */}
          <div
            className={`mt-2 w-[90vw] max-w-xs mx-auto transition-all duration-500 ease-out transform-gpu ${
              isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
            }`}
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl">
              <div className="flex flex-col space-y-1">
                {isOnEditor && (
                  <>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => onLanguageChange(e.target.value)}
                      className={`bg-white/5 border border-white/20 text-white/80 text-sm px-3 py-3 rounded-lg hover:bg-white/10 focus:outline-none transition-all duration-300 font-medium cursor-pointer transform hover:scale-[1.02] hover:translate-x-1 ${
                        isOpen ? 'animate-scale-in' : ''
                      }`}
                      style={{
                        animationDelay: isOpen ? '100ms' : '0ms',
                      }}
                    >
                      <option value="java" className="bg-gray-900">Java</option>
                      <option value="python" className="bg-gray-900">Python</option>
                      <option value="javascript" className="bg-gray-900">JavaScript</option>
                    </select>
                    <div className="h-px bg-white/10 my-2" />
                  </>
                )}
                <button
                  className={`relative bg-white hover:bg-gray-50 text-black font-medium px-6 py-3 rounded-full flex items-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group transform ${
                    isOpen ? 'animate-scale-in' : ''
                  }`}
                  style={{
                    animationDelay: isOpen ? (isOnEditor ? '180ms' : '100ms') : '0ms',
                  }}
                  onClick={() => {
                    isOnEditor ? onAnalyzeClick() : onGetStarted();
                    setIsOpen(false);
                  }}
                  disabled={isAnalyzing && isOnEditor}
                >
                  <span className="mr-2">{isOnEditor ? (isAnalyzing ? '⏳ Analyzing' : '▶ Analyze') : 'Get Started'}</span>
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default Header;
