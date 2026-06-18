import React, { useState } from 'react';

const ExplanationPanel = ({ explanation, timeComplexity, spaceComplexity }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const normalizedTimeComplexity = timeComplexity && timeComplexity !== 'Unknown'
    ? timeComplexity
    : null;
  const normalizedSpaceComplexity = spaceComplexity && spaceComplexity !== 'Unknown'
    ? spaceComplexity
    : null;
  const showComplexitySection = normalizedTimeComplexity || normalizedSpaceComplexity;

  if (!explanation) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .explanation-panel {
          animation: slideIn 0.5s ease-out;
        }
        .complexity-card {
          transition: all 0.3s ease;
        }
        .complexity-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
        }
      `}</style>
      <div className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/30 rounded-xl overflow-hidden backdrop-blur-sm explanation-panel">
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-blue-500/30 px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-blue-400 text-base sm:text-xl">💡</span>
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">AI Explanation</h2>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              {isExpanded ? '▼' : '►'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-6">
            <div className="text-gray-200 text-xs sm:text-sm leading-relaxed">
              {explanation.split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('**') || paragraph.includes('**')) {
                  return (
                    <p key={idx} className="mb-4 text-base">
                      {paragraph.split(/\*\*/).map((part, i) =>
                        i % 2 === 0 ? (
                          <span key={i}>{part}</span>
                        ) : (
                          <strong key={i} className="text-blue-300 font-semibold">
                            {part}
                          </strong>
                        )
                      )}
                    </p>
                  );
                }

                if (paragraph.includes('`')) {
                  return (
                    <p key={idx} className="mb-4">
                      {paragraph.split(/`/).map((part, i) =>
                        i % 2 === 0 ? (
                          <span key={i}>{part}</span>
                        ) : (
                          <code
                            key={i}
                            className="bg-primary-dark/80 px-2 py-1 rounded text-green-400 font-mono text-xs border border-green-500/30"
                          >
                            {part}
                          </code>
                        )
                      )}
                    </p>
                  );
                }

                return (
                  <p key={idx} className="mb-4 text-gray-300">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {showComplexitySection && (
              <div className="space-y-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-blue-500/20">
                <h3 className="text-xs sm:text-sm font-bold text-blue-300 uppercase tracking-wide flex items-center gap-2">
                  <span>📊</span> <span className="hidden sm:inline">Algorithm</span> Complexity Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {normalizedTimeComplexity && (
                    <div className="complexity-card bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-3 sm:p-4 hover:border-cyan-400/50">
                      <p className="text-xs text-cyan-400 font-semibold mb-2 uppercase tracking-wider">⏱️ Time Complexity</p>
                      <p className="text-cyan-200 font-mono font-bold text-base sm:text-lg">{normalizedTimeComplexity}</p>
                      <p className="text-xs text-gray-400 mt-2 hidden sm:block">Algorithm's runtime growth</p>
                    </div>
                  )}
                  {normalizedSpaceComplexity && (
                    <div className="complexity-card bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-3 sm:p-4 hover:border-purple-400/50">
                      <p className="text-xs text-purple-400 font-semibold mb-2 uppercase tracking-wider">💾 Space Complexity</p>
                      <p className="text-purple-200 font-mono font-bold text-base sm:text-lg">{normalizedSpaceComplexity}</p>
                      <p className="text-xs text-gray-400 mt-2 hidden sm:block">Memory usage growth</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ExplanationPanel;
