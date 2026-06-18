import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco Editor web workers
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

const CodeEditor = ({ code, onCodeChange, language }) => {
  const editorRef = useRef(null);
  const monacoEditorRef = useRef(null);
  const containerRef = useRef(null);
  const [isClosed, setIsClosed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Sample code templates for different languages
  const sampleCodes = {
    java: `public class UserManager {
    public String getUserInfo(User user) {
        if(user = null) {  // Bug: = instead of ==
            return null;
        }
        return user.getName();
    }

    public void printUsers(User[] users) {
        for(int i = 0; i <= users.length; i++) {  // Bug: infinite loop risk
            System.out.println(users[i].getName());
        }
    }
}`,
    python: `def process_list(items=[]):  # Bug: mutable default
    count = 0
    total = 0
    
    for item in items:
        total += item
        if total > 100:
            break
    
    print(undefined_var)  # Bug: undefined variable
    return total


def fetch_user(user_id):
    user = get_user(user_id)
    print(user["name"])  # Bug: no null check`,
    javascript: `async function fetchData(userId) {
    // Bug: no error handling
    const response = await fetch(\`/api/users/\${userId}\`);
    const data = await response.json();
    
    // Bug: accessing undefined property
    console.log(data.user.profile.name);
    
    // Bug: callback hell
    fetch('/api/posts').then(r => r.json()).then(posts => {
        posts.forEach(post => {
            fetch(\`/api/comments/\${post.id}\`).then(r => r.json()).then(comments => {
                console.log(comments);
            });
        });
    });
}`,
  };

  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      // Responsive font size based on screen width
      const isMobile = window.innerWidth < 640;
      const fontSize = isMobile ? 12 : 14;
      
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: code || sampleCodes[language],
        language: language === 'javascript' ? 'javascript' : language,
        theme: 'vs-dark',
        fontSize: fontSize,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        wordWrap: 'on',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: true,
        formatOnType: true,
      });

      monacoEditorRef.current.onDidChangeModelContent(() => {
        const currentCode = monacoEditorRef.current.getValue();
        onCodeChange(currentCode);
      });
    }

    return () => {
      // Cleanup is handled by Monaco
    };
  }, []);

  // Change language when dropdown changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      const model = monacoEditorRef.current.getModel();
      const newLanguage = language === 'javascript' ? 'javascript' : language;
      monaco.editor.setModelLanguage(model, newLanguage);
      
      // Set sample code for the language if editor is empty
      if (!code || code.trim() === '') {
        monacoEditorRef.current.setValue(sampleCodes[language]);
      }
    }
  }, [language]);

  // Handle responsive layout changes
  useEffect(() => {
    const handleResize = () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.layout();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mac button handlers
  const handleClose = () => {
    setIsClosed(!isClosed);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const handleMinimize = () => {
    if (!isClosed) {
      setIsMinimized(!isMinimized);
      setIsMaximized(false);
    }
  };

  const handleMaximize = () => {
    if (!isClosed) {
      setIsMaximized(!isMaximized);
      setIsMinimized(false);
    }
  };

  // Calculate responsive height
  const getEditorHeight = () => {
    if (isClosed) return '0px';
    if (isMinimized) return '100px';
    if (isMaximized) {
      if (typeof window === 'undefined') return '600px';
      return '600px';
    }
    if (typeof window === 'undefined') return '400px';
    const width = window.innerWidth;
    if (width < 640) return '300px'; // Mobile
    if (width < 1024) return '350px'; // Tablet
    return '400px'; // Desktop
  };

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ease-in-out" ref={containerRef} style={{ opacity: isClosed ? 0.3 : 1, transform: isClosed ? 'scale(0.95)' : 'scale(1)' }}>
      {/* Mac-style window header */}
      <div className="bg-[#3c4043] px-4 py-3 flex items-center justify-between">
        {/* Mac window controls */}
        <div className="flex items-center gap-2">
          <div 
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff4136] transition-all duration-200 cursor-pointer group relative"
            title="Close"
          >
            {!isClosed && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-[#4a0000] opacity-0 group-hover:opacity-100 transition-opacity">✕</span>}
          </div>
          <div 
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffa500] transition-all duration-200 cursor-pointer group relative"
            title="Minimize"
          >
            {!isClosed && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-[#4a3000] opacity-0 group-hover:opacity-100 transition-opacity">−</span>}
          </div>
          <div 
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#00d100] transition-all duration-200 cursor-pointer group relative"
            title="Maximize"
          >
            {!isClosed && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-[#003a00] opacity-0 group-hover:opacity-100 transition-opacity">{isMaximized ? '−' : '+'}</span>}
          </div>
        </div>
        
        {/* Window title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-gray-300 text-xs sm:text-sm font-medium">
            {language.charAt(0).toUpperCase() + language.slice(1)} Code
          </span>
        </div>
        
        {/* Right side placeholder */}
        <div className="w-16"></div>
      </div>
      
      {/* Editor container */}
      <div
        ref={editorRef}
        className="editor-container bg-[#1e1e1e] transition-all duration-500 ease-in-out"
        style={{ height: getEditorHeight(), width: '100%', opacity: isClosed ? 0 : 1 }}
      />
    </div>
  );
};

export default CodeEditor;
