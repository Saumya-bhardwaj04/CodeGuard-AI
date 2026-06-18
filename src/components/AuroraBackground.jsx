import React from 'react';

const AuroraBackground = ({ colorStops = ['#475569', '#64748b', '#475569'], speed = 0.8, blend = 0.6 }) => {
  return (
    <>
      <div className="aurora-background" />
      <style>{`
        .aurora-background {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          opacity: ${blend};
        }

        .aurora-background::before,
        .aurora-background::after {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: linear-gradient(
            120deg,
            transparent,
            ${colorStops[0]} 20%,
            ${colorStops[1]} 50%,
            ${colorStops[2]} 80%,
            transparent
          );
          animation: aurora-flow ${30 / speed}s ease-in-out infinite;
          filter: blur(80px);
        }

        .aurora-background::after {
          background: linear-gradient(
            240deg,
            transparent,
            ${colorStops[1]} 20%,
            ${colorStops[0]} 50%,
            ${colorStops[2]} 80%,
            transparent
          );
          animation: aurora-flow-reverse ${35 / speed}s ease-in-out infinite;
          animation-delay: -5s;
          filter: blur(100px);
        }

        @keyframes aurora-flow {
          0%, 100% {
            transform: translate(0%, 0%) rotate(0deg) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(10%, -15%) rotate(45deg) scale(1.1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-5%, 10%) rotate(90deg) scale(1.2);
            opacity: 0.4;
          }
          75% {
            transform: translate(-15%, -5%) rotate(135deg) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes aurora-flow-reverse {
          0%, 100% {
            transform: translate(0%, 0%) rotate(180deg) scale(1);
            opacity: 0.2;
          }
          25% {
            transform: translate(-10%, 15%) rotate(225deg) scale(1.15);
            opacity: 0.4;
          }
          50% {
            transform: translate(5%, -10%) rotate(270deg) scale(1.25);
            opacity: 0.3;
          }
          75% {
            transform: translate(15%, 5%) rotate(315deg) scale(1.15);
            opacity: 0.4;
          }
        }
      `}</style>
    </>
  );
};

export default AuroraBackground;
