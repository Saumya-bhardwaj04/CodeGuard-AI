import React, { useState } from 'react';

const BugReport = ({ bugs }) => {
  const [expandedBug, setExpandedBug] = useState(null);

  const getSeverityClass = (severity) => {
    const severityMap = {
      High: 'bg-red-950/15 border-l-4 border-red-500/60 text-red-100 hover:bg-red-950/25 hover:shadow-md hover:shadow-red-500/5',
      Medium: 'bg-yellow-950/15 border-l-4 border-yellow-500/60 text-yellow-100 hover:bg-yellow-950/25 hover:shadow-md hover:shadow-yellow-500/5',
      Low: 'bg-green-950/15 border-l-4 border-green-500/60 text-green-100 hover:bg-green-950/25 hover:shadow-md hover:shadow-green-500/5',
    };
    return severityMap[severity] || 'bg-gray-950/15 border-l-4 border-gray-500/60 text-gray-100';
  };

  const getSeverityIcon = (severity) => {
    const iconMap = { High: '🔴', Medium: '🟠', Low: '🟢' };
    return iconMap[severity] || '🟡';
  };

  if (!bugs || bugs.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        .bug-item { transition: all 0.3s ease; }
        .bug-item:hover { background-color: rgba(255, 255, 255, 0.02); }
        .bug-description { animation: slideDown 0.3s ease-out; }
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div className="glass-effect p-4 sm:p-5 lg:p-6 rounded-xl border border-white/10 shadow-md shadow-red-500/5">
        <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <span className="text-xl sm:text-2xl">🐛</span>
          <div className="flex-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Bug Report</h2>
          </div>
          <span className="bg-red-600/40 text-red-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold tracking-wide border border-red-500/30 shadow-sm shadow-red-500/5">
            {bugs.length} {bugs.length === 1 ? 'Issue' : 'Issues'}
          </span>
        </div>

        <div className="space-y-3">
          {bugs.map((bug, index) => {
            const bugKey = `${bug.id ?? bug.line ?? index}-${bug.issue ?? bug.type ?? 'issue'}`;
            const isExpanded = expandedBug === bugKey;

            return (
              <div
                key={bugKey}
                onClick={() => setExpandedBug(isExpanded ? null : bugKey)}
                className={`bug-item ${getSeverityClass(bug.severity)} p-3 sm:p-4 rounded-lg cursor-pointer backdrop-blur-sm border border-white/5 transition-all duration-200 ${isExpanded ? 'ring-1 ring-white/10' : ''}`}
                style={isExpanded ? { '--tw-ring-color': 'rgba(255,255,255,0.1)' } : {}}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1">
                    <span className="text-lg sm:text-xl lg:text-2xl mt-0.5 hidden sm:block\">
                      {getSeverityIcon(bug.severity)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wide">{bug.type || bug.issue || 'Issue'}</h3>
                        <span className="text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 bg-black/40 rounded-md border border-white/10 font-mono">
                          Line {bug.line || '-'}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                          bug.severity === 'High' ? 'bg-red-500/20 text-red-300' :
                          bug.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {bug.severity} Severity
                        </span>
                      </div>
                      {isExpanded && (bug.description || bug.issue) && (
                        <div className="bug-description mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm leading-relaxed">{bug.description || bug.issue}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg ml-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
          <p className="font-bold text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 uppercase tracking-wider">📋 Severity Guide:</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="glass-effect rounded-lg p-2 sm:p-3 border border-red-500/30 hover:border-red-400/50 transition-all">
              <p className="text-red-300 font-semibold text-xs sm:text-sm">🔴 High</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">Fix immediately</p>
            </div>
            <div className="glass-effect rounded-lg p-2 sm:p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all">
              <p className="text-yellow-300 font-semibold text-xs sm:text-sm">🟠 Medium</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">Should fix</p>
            </div>
            <div className="glass-effect rounded-lg p-2 sm:p-3 border border-green-500/30 hover:border-green-400/50 transition-all">
              <p className="text-green-300 font-semibold text-xs sm:text-sm">🟢 Low</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">May improve</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default BugReport;
