import React from 'react';

const OptimizationPanel = ({ optimization }) => {
  // Don't show if no optimization or if it says "No optimizations needed"
  if (!optimization || optimization.length === 0) {
    return null;
  }
  
  // Check if the optimization message indicates no optimizations needed
  const isNoOptimization = Array.isArray(optimization) 
    ? optimization.some(opt => typeof opt === 'string' && opt.toLowerCase().includes('no optimization'))
    : typeof optimization === 'string' && optimization.toLowerCase().includes('no optimization');
  
  if (isNoOptimization) {
    return null;
  }

  return (
    <div className="bg-secondary-dark border border-purple-500/20 rounded-lg overflow-hidden">
      <div className="bg-purple-900/20 border-b border-purple-500/20 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-base sm:text-lg">⚡</span>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold text-purple-300">Code Optimization Suggestions</h2>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="space-y-2">
          {Array.isArray(optimization) ? (
            optimization.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-purple-900/10 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition"
              >
                <span className="text-purple-400 font-bold flex-shrink-0 mt-1">
                  {idx + 1}
                </span>
                <p className="text-gray-200 text-sm">{suggestion}</p>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-900/10 rounded-lg border border-purple-500/10">
              <span className="text-purple-400 font-bold flex-shrink-0 mt-0.5 sm:mt-1">•</span>
              <p className="text-gray-200 text-xs sm:text-sm">{optimization}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-purple-900/10 border-t border-purple-500/20 px-3 sm:px-4 py-2 sm:py-3">
        <p className="text-xs text-purple-300">
          💡 Implementing these suggestions can improve code efficiency, readability, and maintainability.
        </p>
      </div>
    </div>
  );
};

export default OptimizationPanel;
