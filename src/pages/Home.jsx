import React, { useState } from 'react';
import Header from '../components/Header';
import CodeEditor from '../components/CodeEditor';
import BugReport from '../components/BugReport';
import FixSuggestion from '../components/FixSuggestion';
import ExplanationPanel from '../components/ExplanationPanel';
import OptimizationPanel from '../components/OptimizationPanel';
import RiskScoreDisplay from '../components/RiskScoreDisplay';
import WelcomePage from '../components/WelcomePage';
import AuroraBackground from '../components/AuroraBackground';
import { analyzeCode } from '../api/api';

const Home = () => {
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [isOnEditor, setIsOnEditor] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#/editor';
    }
    return false;
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      const isEditor = window.location.hash === '#/editor';
      setIsOnEditor(isEditor);
      if (!isEditor) {
        setCode('');
        setAnalysisResult(null);
        setError(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Sync state to initial hash
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setCode(''); // Clear code when language changes
    setAnalysisResult(null); // Clear results when language changes
    setError(null);
  };

  const handleGetStarted = () => {
    window.location.hash = '/editor';
  };

  const handleBackToWelcome = () => {
    window.location.hash = '';
  };

  const handleAnalyzeClick = async () => {
    if (!code.trim()) {
      setError('Please write or paste some code before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Call the real AI backend
      const result = await analyzeCode(code, selectedLanguage);
      setAnalysisResult(result);
    } catch (err) {
      const message = err?.message || '';
      const isServiceFailure = /analysis service encountered|unable to connect|something went wrong|taking longer than expected/i.test(message.toLowerCase());
      if (isServiceFailure) {
        // Hide backend/service failures from UI to avoid alarming users.
        setError(null);
      } else {
        setError(message || 'Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Aurora Background - Fixed like copy-ui */}
      <div className="fixed inset-0 w-full h-full">
        <AuroraBackground 
          colorStops={['#475569', '#64748b', '#475569']} 
          speed={0.8} 
          blend={0.6} 
        />
      </div>
      
      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <Header
        onLanguageChange={handleLanguageChange}
        selectedLanguage={selectedLanguage}
        onAnalyzeClick={handleAnalyzeClick}
        isAnalyzing={isAnalyzing}
        isOnEditor={isOnEditor}
        onGetStarted={handleGetStarted}
      />

      {/* Welcome Page - Show when not on editor */}
      {!isOnEditor ? (
        <WelcomePage onGetStarted={handleGetStarted} />
      ) : (
        <>
          {/* Main Content - Show when on editor */}
          <main className="flex-1 overflow-y-auto relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6 sm:pt-28 lg:pt-32 space-y-4 lg:space-y-5">
              {/* Error Message */}
              {error && (
                <div className="backdrop-blur-md bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-red-300 flex items-center gap-2 shadow-lg">
                  <span>❌</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Back Button */}
              <button
                onClick={handleBackToWelcome}
                className="group inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white cursor-pointer shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span>Go Back</span>
              </button>

              {/* Code Editor Section */}
              <section>
                <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4 w-full">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>📝</span>
                    Code Editor
                  </h2>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white/90 text-sm px-3 py-1.5 rounded-xl hover:border-white/40 focus:outline-none focus:border-white/60 transition-all duration-200 cursor-pointer font-semibold shadow-md"
                  >
                    <option value="java" className="bg-gray-900">Java</option>
                    <option value="python" className="bg-gray-900">Python</option>
                    <option value="javascript" className="bg-gray-900">JavaScript</option>
                  </select>
                </div>
                <CodeEditor
                  code={code}
                  onCodeChange={handleCodeChange}
                  language={selectedLanguage}
                />
              </section>

              {/* Results Section - Only show if analysis has been performed */}
              {analysisResult && (
                <section className="space-y-8 animate-fadeIn">
                  {/* Show different message based on bugs count */}
                  {analysisResult.bugs?.length === 0 ? (
                    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-2 border-green-500/40 rounded-2xl p-8 text-center shadow-lg shadow-green-500/10">
                      <div className="text-6xl mb-4 animate-bounce">✨</div>
                      <h3 className="text-3xl font-bold text-green-300 mb-3">Perfect Code!</h3>
                      <p className="text-green-200 text-lg mb-4">
                        No issues detected. Your code follows best practices.
                      </p>
                      <div className="flex items-center justify-center gap-3 text-sm text-green-300/80">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Clean & Secure
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Ready to Deploy
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-green-300 text-sm flex items-center gap-2">
                        <span>✓</span>
                        Analysis Complete! Check the results below.
                      </p>
                    </div>
                  )}

                  {/* Risk Score */}
                  <div>
                    <RiskScoreDisplay
                      riskScore={analysisResult.riskScore || 0}
                      bugsCount={analysisResult.bugs?.length || 0}
                    />
                  </div>

                  {/* Bug Report */}
                  <div>
                    <BugReport bugs={analysisResult.bugs} />
                  </div>

                  {/* Fix Suggestion */}
                  <div>
                    <FixSuggestion fix={analysisResult.fix} />
                  </div>

                  {/* Explanation */}
                  <div>
                    <ExplanationPanel
                      explanation={analysisResult.explanation}
                      timeComplexity={analysisResult.timeComplexity}
                      spaceComplexity={analysisResult.spaceComplexity}
                    />
                  </div>

                  {/* Optimization Suggestions */}
                  <div>
                    <OptimizationPanel optimization={analysisResult.optimization} />
                  </div>
                </section>
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t border-white/10 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/[0.08]),transparent)] px-6 py-12 lg:py-16 backdrop-blur-md z-10">
            <div className="bg-white/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Let's Connect</h3>
              <p className="text-gray-400 text-sm">Feel free to reach out for collaborations or just a friendly hello</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              <a href="https://linkedin.com/in/saumya-bhardwaj04/" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span className="text-sm">LinkedIn</span>
              </a>
              
              <a href="https://github.com/Saumya-bhardwaj04/" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm">GitHub</span>
              </a>
              
              <a href="mailto:samisharma000@gmail.com" className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z"/>
                </svg>
                <span className="text-sm">samisharma000@gmail.com</span>
              </a>
              
              <a href="tel:+919717831874" className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.799-7.82-4.609-8.994l2.083-1.026-3.493-6.817-2.106 1.039c-7.202 3.755 4.233 25.982 11.6 22.615.121-.055 2.102-1.029 2.11-1.033z"/>
                </svg>
                <span className="text-sm">+919717831874</span>
              </a>
            </div>
            
            <div className="text-center pt-6 border-t border-white/10 w-full">
              <p className="text-gray-400 text-sm">© 2026 CodeGuard AI. All rights reserved.</p>
              <p className="text-gray-500 text-xs mt-2">Powered by AI • Made with ❤️</p>
            </div>
          </footer>
        </>
      )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.8);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3));
          border-radius: 5px;
          border: 2px solid rgba(15, 23, 42, 0.8);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5));
        }
      `}</style>
    </div>
  );
};

export default Home;
