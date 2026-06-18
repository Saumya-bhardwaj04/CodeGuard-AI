import React, { useState, useEffect } from 'react';

const RiskScoreDisplay = ({ riskScore, bugsCount }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  const safeRiskScore = Number.isFinite(Number(riskScore)) ? Number(riskScore) : 0;
  const effectiveRiskScore = bugsCount === 0 ? 0 : Math.max(0, Math.min(100, safeRiskScore));

  useEffect(() => {
    let animationFrame;
    let currentScore = 0;
    const increment = effectiveRiskScore / 30;

    // Always reset when new analysis arrives, especially when dropping from high risk to zero.
    setAnimatedScore(0);

    if (effectiveRiskScore === 0) {
      return () => cancelAnimationFrame(animationFrame);
    }

    const animate = () => {
      if (currentScore < effectiveRiskScore) {
        currentScore += increment;
        setAnimatedScore(Math.min(currentScore, effectiveRiskScore));
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [effectiveRiskScore]);

  const getRiskLevel = (score) => {
    if (score >= 80) return { level: 'CRITICAL', color: 'text-red-400', bgColor: 'bg-red-950/20', glow: 'shadow-md shadow-red-500/10' };
    if (score >= 60) return { level: 'HIGH', color: 'text-orange-400', bgColor: 'bg-orange-950/20', glow: 'shadow-md shadow-orange-500/10' };
    if (score >= 40) return { level: 'MEDIUM', color: 'text-yellow-400', bgColor: 'bg-yellow-950/20', glow: 'shadow-md shadow-yellow-500/10' };
    return { level: 'LOW', color: 'text-green-400', bgColor: 'bg-green-950/20', glow: 'shadow-md shadow-green-500/10' };
  };

  const riskInfo = getRiskLevel(animatedScore);
  const progressPercentage = animatedScore;

  return (
    <>
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        @keyframes barFlow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .risk-card {
          transform-style: preserve-3d;
        }
        /* Subtle hover animation */
        @media (min-width: 640px) {
          .sm\\:hover\\:risk-card:hover {
            animation: subtlePulse 2s ease-in-out infinite;
          }
        }
        .progress-flow {
          animation: barFlow 4s linear infinite;
          background-size: 200% 100%;
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          transition: transform 0.3s ease;
        }
      `}</style>
      <div className={`p-4 sm:p-5 lg:p-6 rounded-xl border border-white/10 glass-effect transition-all duration-500 ${riskInfo.bgColor} ${riskInfo.glow}`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white flex items-center gap-2">
            <span className="hidden sm:inline">🎯</span>Code Risk Assessment
          </h3>
          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold tracking-wider transition-all ${riskInfo.color}`}>
            {riskInfo.level}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-300 font-medium text-xs sm:text-sm whitespace-nowrap">Risk Score:</span>
            <div className="flex-1">
              <div className="w-full bg-gradient-to-r from-secondary-dark to-primary-dark rounded-full h-2.5 sm:h-3 overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-300 progress-flow ${
                    progressPercentage >= 80
                      ? 'bg-gradient-to-r from-red-600 to-red-400'
                      : progressPercentage >= 60
                      ? 'bg-gradient-to-r from-orange-600 to-orange-400'
                      : progressPercentage >= 40
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                      : 'bg-gradient-to-r from-green-600 to-green-400'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <span className={`text-xl sm:text-2xl font-bold min-w-fit score-text ${riskInfo.color}`}>
              {Math.round(animatedScore)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="glass-effect rounded-lg px-2 sm:px-4 py-2 sm:py-3 hover-lift hover:border-blue-400/30">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1 sm:mb-2">Issues</p>
              <p className={`text-2xl sm:text-3xl font-bold ${riskInfo.color}`}>{bugsCount}</p>
            </div>
            <div className="glass-effect rounded-lg px-2 sm:px-4 py-2 sm:py-3 hover-lift hover:border-purple-400/30">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1 sm:mb-2">Status</p>
              <p className="text-xs sm:text-sm font-semibold text-white">{riskInfo.level}</p>
            </div>
            <div className="glass-effect rounded-lg px-2 sm:px-4 py-2 sm:py-3 hover-lift hover:border-cyan-400/30">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1 sm:mb-2">Fix Priority</p>
              <p className="text-xs sm:text-sm font-bold text-cyan-400">{animatedScore >= 60 ? 'HIGH' : 'LOW'}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-300 leading-relaxed">
            {effectiveRiskScore >= 80
              ? '🚨 Critical issues found. Fix these bugs immediately before deployment.'
              : effectiveRiskScore >= 60
              ? '⚠️ High-risk issues detected. Please review and fix the suggested issues.'
              : effectiveRiskScore >= 40
              ? '🔧 Medium-risk issues found. Consider implementing the suggested fixes.'
              : '✅ Good code quality. Minor improvements are optional.'}
          </p>
        </div>
      </div>
    </>
  );
};

export default RiskScoreDisplay;
