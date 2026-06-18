import React, { useState } from 'react';

const FixSuggestion = ({ fix }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't show if no fix needed or if it's the "clean code" message
  if (!fix || fix.includes('No fixes needed') || fix.includes('code is clean')) {
    return null;
  }

  return (
    <div className="bg-secondary-dark border border-green-500/20 rounded-lg overflow-hidden">
      <div className="bg-green-900/20 border-b border-green-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-lg">✓</span>
          <h2 className="text-lg font-bold text-green-300">Suggested Fix</h2>
        </div>
        <button
          onClick={copyToClipboard}
          className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-300 rounded text-sm font-semibold transition"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <div className="p-4">
        <pre className="bg-primary-dark border border-secondary-dark rounded p-4 overflow-x-auto text-sm font-mono text-green-400 leading-relaxed">
          <code>{fix}</code>
        </pre>
      </div>

      <div className="bg-green-900/10 border-t border-green-500/20 px-3 sm:px-4 py-2 sm:py-3">
        <p className="text-xs text-green-300">
          ✓ This corrected code fixes the issues identified in your analysis.
        </p>
      </div>
    </div>
  );
};

export default FixSuggestion;
