import React, { useState, useEffect } from 'react';

const RotatingText = ({ 
  texts = ['Growth', 'Innovation', 'Efficiency'], 
  rotationInterval = 2000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 300);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [texts.length, rotationInterval]);

  return (
    <span className={`rotating-text-wrapper ${className}`}>
      <span 
        className={`rotating-text ${isAnimating ? 'rotating' : ''}`}
        key={currentIndex}
      >
        {texts[currentIndex]}
      </span>
      <style>{`
        .rotating-text-wrapper {
          display: inline-block;
          position: relative;
          overflow: hidden;
          vertical-align: bottom;
          padding-bottom: 0.15em;
          margin-bottom: -0.15em;
        }

        .rotating-text {
          display: inline-block;
          padding-bottom: 0.15em;
          margin-bottom: -0.15em;
          animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .rotating-text.rotating {
          animation: slideOut 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
};

export default RotatingText;
