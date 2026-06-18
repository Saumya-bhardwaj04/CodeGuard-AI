import React, { useEffect, useState } from 'react';
import AuroraBackground from './AuroraBackground';
import RotatingText from './RotatingText';

const WelcomePage = ({ onGetStarted }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const revealElements = document.querySelectorAll('[data-reveal]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Aurora Background */}
      <AuroraBackground 
        colorStops={['#1e3a8a', '#3b82f6', '#8b5cf6']} 
        speed={0.6} 
        blend={0.4} 
      />
      
      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />
      
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03] z-[1]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">

          {/* HERO */}
          <section data-reveal className="reveal text-center mb-40 min-h-screen flex flex-col justify-center items-center">
            {/* Badge */}
            <div className="inline-flex items-center justify-center mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium animate-fade-in-badge">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                AI-Powered Code Analysis
              </div>
            </div>

            <div className="space-y-8 mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                <span className="inline-block">Elevate your</span>
                <br />
                <div className="inline-flex items-center justify-center flex-wrap gap-3 mt-4">
                  <span className="text-foreground">Code</span>
                  <RotatingText
                    texts={['Security', 'Quality', 'Performance', 'Reliability']}
                    className="px-4 bg-white text-black rounded-xl shadow-2xl py-2 font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                    rotationInterval={2500}
                  />
                </div>
              </h1>

              <p className="text-gray-300 text-base sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
                CodeGuard AI helps developers detect bugs, get intelligent fixes, and understand code complexity — 
                all running <span className="text-white font-semibold bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg">100% locally</span> on your machine
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={onGetStarted}
                className="group relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 bg-white text-black hover:bg-gray-100 hover:scale-105 hover:shadow-2xl cursor-pointer overflow-hidden flex items-center gap-2"
              >
                <span>🚀</span>
                <span>Start Now</span>
              </button>
            </div>

            {/* Trust Indicators
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">Trusted by developers worldwide</p>
            </div> */}
          </section>

          {/* Features Heading */}
          <section className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              Powerful Features
            </h2>
            <div className="w-32 h-1 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4"></div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to write better, safer, and more efficient code
            </p>
          </section>

          {/* FEATURES MARQUEE */}
          <section className="relative mb-40 rounded-[28px] border border-white/10 bg-black/30 overflow-hidden">
            <div className="absolute left-0 top-0 z-20 h-full w-16 sm:w-24 rounded-r-[28px] bg-gradient-to-r from-black via-black/85 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 z-20 h-full w-16 sm:w-24 rounded-l-[28px] bg-gradient-to-l from-black via-black/85 to-transparent pointer-events-none" />
            <div className="overflow-hidden py-6 px-2 sm:px-4">
              <div className="marquee-right-track">
                {[
                  {
                    icon: '🐛',
                    title: 'Bug Detection',
                    desc: 'AI-powered analysis identifies bugs, code smells, and potential issues with detailed explanations.',
                    gradient: 'from-cyan-400 to-blue-500'
                  },
                  {
                    icon: '✨',
                    title: 'Smart Code Fixes',
                    desc: 'Get AI-suggested code fixes with corrected implementations ready to copy and use.',
                    gradient: 'from-yellow-400 to-orange-500'
                  },
                  {
                    icon: '📊',
                    title: 'Complexity Analysis',
                    desc: 'Understand algorithm efficiency with Time and Space complexity calculations.',
                    gradient: 'from-blue-400 to-purple-500'
                  },
                  {
                    icon: '⚡',
                    title: 'Performance Tips',
                    desc: 'Receive actionable optimization suggestions to improve code quality and maintainability.',
                    gradient: 'from-orange-400 to-pink-500'
                  },
                  {
                    icon: '🐛',
                    title: 'Bug Detection',
                    desc: 'AI-powered analysis identifies bugs, code smells, and potential issues with detailed explanations.',
                    gradient: 'from-cyan-400 to-blue-500'
                  },
                  {
                    icon: '✨',
                    title: 'Smart Code Fixes',
                    desc: 'Get AI-suggested code fixes with corrected implementations ready to copy and use.',
                    gradient: 'from-yellow-400 to-orange-500'
                  },
                  {
                    icon: '📊',
                    title: 'Complexity Analysis',
                    desc: 'Understand algorithm efficiency with Time and Space complexity calculations.',
                    gradient: 'from-blue-400 to-purple-500'
                  },
                  {
                    icon: '⚡',
                    title: 'Performance Tips',
                    desc: 'Receive actionable optimization suggestions to improve code quality and maintainability.',
                    gradient: 'from-orange-400 to-pink-500'
                  }
                ].map((feature, index) => (
                  <article
                    key={`${feature.title}-${index}`}
                    className="feature-marquee-card group relative w-[320px] sm:w-[420px] md:w-[480px] p-8 rounded-2xl transition-all duration-500 overflow-hidden shrink-0"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/[0.05] via-transparent to-white/[0.02] opacity-70" />

                    <div className="relative mb-6 transition-transform duration-500 group-hover:scale-105">
                      <div className="feature-icon-shell">
                        <span className="text-3xl">{feature.icon}</span>
                        <span className="feature-icon-glow" />
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h2 className="text-xl font-bold text-white mb-3">
                        {feature.title}
                      </h2>

                      <p className="text-gray-400 leading-relaxed text-sm">
                        {feature.desc}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section data-reveal className="reveal mb-40">
            <div className="text-center mb-12">
              <h3 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                How It Works
              </h3>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 mx-auto rounded-full opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            </div>

            <div className="space-y-6 max-w-4xl mx-auto">
              {[
                { num: '1', title: 'Select Your Language', desc: 'Choose from Java, Python, or JavaScript.', color: 'from-blue-500/10' },
                { num: '2', title: 'Write or Paste Code', desc: 'Use the Monaco editor to write your code.', color: 'from-cyan-500/10' },
                { num: '3', title: 'Analyze Your Code', desc: 'Click Analyze Code to run AI analysis.', color: 'from-purple-500/10' },
                { num: '4', title: 'Review Results', desc: 'Get detailed reports with bug fixes, explanations, and optimization suggestions.', color: 'from-pink-500/10' }
              ].map((step, index) => (
                <div
                  key={step.num}
                  data-reveal
                  style={{ transitionDelay: `${index * 100}ms` }}
                  className="reveal group"
                >
                  <div className={`step-card bg-gradient-to-r ${step.color} to-transparent backdrop-blur-sm`}>
                    <div className="step-circle group-hover:scale-125 group-hover:shadow-md group-hover:shadow-blue-500/20 transition-all duration-300">
                      {step.num}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300 mb-1">
                        {step.title}
                      </h4>

                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                        {step.desc}
                      </p>
                    </div>

                    <div className="hidden sm:block w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* LANGUAGES */}
          <section data-reveal className="reveal text-center pb-16">
            <div className="mb-12">
              <h3 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                Supported Languages
              </h3>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 mx-auto rounded-full opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              {[
                { icon: '☕', name: 'Java', desc: 'Full OOP Support', color: 'from-orange-500/10', borderColor: 'group-hover:border-orange-500/30' },
                { icon: '🐍', name: 'Python', desc: 'Complete Support', color: 'from-green-500/10', borderColor: 'group-hover:border-green-500/30' },
                { icon: '⚙️', name: 'JavaScript', desc: 'TypeScript Ready', color: 'from-yellow-500/10', borderColor: 'group-hover:border-yellow-500/30' }
              ].map((lang, index) => (
                <div
                  key={lang.name}
                  data-reveal
                  style={{ transitionDelay: `${index * 100}ms` }}
                  className={`reveal group language-card bg-gradient-to-br ${lang.color} to-transparent backdrop-blur-xl border border-gray-700/30 ${lang.borderColor} hover:shadow-xl`}
                >
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-300" />
                    <div className="relative text-6xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 animate-float">
                      {lang.icon}
                    </div>
                  </div>

                  <p className="text-3xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                    {lang.name}
                  </p>

                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    {lang.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 sm:p-10 md:p-14 backdrop-blur-md overflow-hidden text-center max-w-4xl mx-auto">
              <div className="absolute inset-0 opacity-55">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
              </div>

              <div className="relative z-10">
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                  Ready to transform your code's
                  <span className="italic text-gray-300"> quality?</span>
                </h3>

                <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
                  Join hundreds of developers already using CodeGuard AI to catch bugs, optimize performance, and write better code.
                </p>

                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  Get Your Code Analysis Today
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Let's Connect Footer */}
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

      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Background gradient */
        .bg-radial {
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(0, 0, 0, 0.4) 100%
          );
        }

        /* Blob animations */
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(40px, -60px) scale(1.15) rotate(120deg);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.9) rotate(240deg);
          }
        }

        @keyframes blob2 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(-50px, 40px) scale(1.08) rotate(90deg);
          }
          66% {
            transform: translate(30px, -50px) scale(0.95) rotate(180deg);
          }
        }

        @keyframes blob3 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(60px, 50px) scale(1.12) rotate(150deg);
          }
          66% {
            transform: translate(-40px, -40px) scale(0.92) rotate(300deg);
          }
        }

        .animate-blob {
          animation: blob 10s ease-in-out infinite;
        }

        .animate-blob-2 {
          animation: blob2 11s ease-in-out infinite;
        }

        .animate-blob-3 {
          animation: blob3 12s ease-in-out infinite;
        }

        @keyframes marquee-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0%);
          }
        }

        .marquee-right-track {
          display: flex;
          gap: 24px;
          width: max-content;
          animation: marquee-right 28s linear infinite;
          will-change: transform;
        }

        .marquee-right-track:hover {
          animation-play-state: paused;
        }

        .feature-marquee-card {
          background: linear-gradient(112deg, rgba(29, 35, 55, 0.92) 0%, rgba(27, 33, 52, 0.95) 50%, rgba(23, 29, 45, 0.94) 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 12px 32px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .feature-marquee-card:hover {
          transform: translateY(-3px) scale(1.01);
          border-color: rgba(148, 163, 184, 0.35);
          box-shadow: 0 16px 38px rgba(2, 6, 23, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.09);
        }

        .feature-icon-shell {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 14px;
          border: 3px solid rgba(56, 189, 248, 0.85);
          background: linear-gradient(180deg, rgba(10, 15, 26, 0.95) 0%, rgba(12, 17, 30, 0.92) 100%);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(125, 211, 252, 0.14);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-icon-glow {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          right: -6px;
          bottom: -6px;
          background: rgba(56, 189, 248, 0.95);
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.95), 0 0 28px rgba(56, 189, 248, 0.7);
        }

        /* Feature pill */
        .feature-pill {
          animation: slideInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Step card enhanced */
        .step-card {
          display: flex;
          gap: 20px;
          padding: 28px;
          border-radius: 20px;
          border: 1px solid rgba(59, 130, 246, 0.15);
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .step-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateX(16px) scale(1.02);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.08), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.05),
                      0 0 20px rgba(59, 130, 246, 0.05);
          background: rgba(30, 58, 138, 0.15);
        }

        .step-circle {
          width: 54px;
          height: 54px;
          min-width: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #93c5fd;
          font-weight: bold;
          font-size: 22px;
          border: 2px solid rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.05);
        }

        /* Language card */
        .language-card {
          padding: 36px 28px;
          border-radius: 24px;
          border: 1px solid rgba(59, 130, 246, 0.15);
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .language-card:hover {
          transform: translateY(-16px) scale(1.05);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 20px 50px rgba(59, 130, 246, 0.12), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.05),
                      0 0 30px rgba(59, 130, 246, 0.08);
          background: rgba(30, 58, 138, 0.15);
        }

        /* CTA Button */
        .cta-button {
          position: relative;
          cursor: pointer;
          border: none;
          outline: none;
        }

        /* Reveal animation */
        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Float animation */
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-25px) rotate(5deg);
          }
        }

        .animate-float {
          animation: float 5s ease-in-out infinite;
        }

        /* Gradient animation */
        @keyframes gradient {
          0% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
          100% {
            background-position: 0% center;
          }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s linear infinite;
        }

        /* Fade in up */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        /* Badge fade in */
        @keyframes fadeInBadge {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in-badge {
          animation: fadeInBadge 0.6s ease-out forwards;
          animation-delay: 0.2s;
          opacity: 0;
        }

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
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

export default WelcomePage;
