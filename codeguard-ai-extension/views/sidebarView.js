const vscode = require('vscode');

class CodeGuardSidebarViewProvider {
  constructor() {
    this.view = undefined;
    this.state = {
      mode: 'Idle',
      bugs: 0,
      high: 0,
      risk: 0,
      lastRun: 'Never'
    };
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;

    const webview = webviewView.webview;
    webview.options = {
      enableScripts: false,
      enableCommandUris: true
    };

    this.render();
  }

  updateState(nextState) {
    this.state = { ...this.state, ...nextState };
    this.render();
  }

  render() {
    if (!this.view) {
      return;
    }

    const webview = this.view.webview;
    const { mode, bugs, high, risk, lastRun } = this.state;
    const riskLabel = risk >= 80 ? 'Critical' : risk >= 60 ? 'High' : risk >= 35 ? 'Moderate' : 'Low';

    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 14px;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, "Segoe UI", sans-serif);
      background-color: var(--vscode-sideBar-background, #1e1e1e);
      font-size: var(--vscode-font-size, 13px);
      line-height: 1.4;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-divider, rgba(255,255,255,0.08));
      text-align: center;
    }
    .header svg {
      width: 44px;
      height: 44px;
      filter: drop-shadow(0 4px 8px rgba(42, 167, 212, 0.25));
      transition: transform 0.3s ease;
    }
    .header svg:hover {
      transform: scale(1.08) rotate(3deg);
    }
    .header-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #7CF1FF 0%, #2AA7D4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .card {
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.06));
      border-radius: 8px;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
      margin-bottom: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.12);
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .card:hover {
      border-color: rgba(42, 167, 212, 0.3);
      transform: translateY(-1px);
    }
    .card-title {
      margin: 0 0 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: rgba(42, 167, 212, 0.85);
    }
    .label {
      font-size: 11px;
      opacity: 0.7;
      color: var(--vscode-descriptionForeground, #969696);
      margin-top: 8px;
    }
    .value {
      font-weight: 600;
      font-size: 15px;
      color: var(--vscode-editor-foreground, #ffffff);
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-critical {
      background-color: rgba(244, 135, 113, 0.15);
      color: #f48771;
      border: 1px solid rgba(244, 135, 113, 0.3);
    }
    .badge-high {
      background-color: rgba(242, 133, 0, 0.15);
      color: #f28500;
      border: 1px solid rgba(242, 133, 0, 0.3);
    }
    .badge-moderate {
      background-color: rgba(204, 167, 0, 0.15);
      color: #cca700;
      border: 1px solid rgba(204, 167, 0, 0.3);
    }
    .badge-low {
      background-color: rgba(117, 190, 255, 0.15);
      color: #75beff;
      border: 1px solid rgba(117, 190, 255, 0.3);
    }
    .row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .btn {
      flex: 1;
      text-decoration: none;
      text-align: center;
      padding: 9px 12px;
      border-radius: 6px;
      color: #0d2330 !important;
      background: linear-gradient(135deg, #7CF1FF 0%, #2AA7D4 100%);
      font-weight: 600;
      font-size: 12px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(42, 167, 212, 0.2);
      transition: opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(42, 167, 212, 0.35);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-secondary {
      color: var(--vscode-button-secondaryForeground, #ffffff) !important;
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
      box-shadow: none;
    }
    .note {
      margin-top: 16px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #969696);
      line-height: 1.5;
      border-left: 2px solid #2AA7D4;
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7CF1FF"/>
          <stop offset="100%" stop-color="#2AA7D4"/>
        </linearGradient>
      </defs>
      <path d="M64 8L18 24v34c0 28 18 52 46 62 28-10 46-34 46-62V24L64 8z" fill="url(#g)"/>
      <path d="M42 64l14 14 30-30" fill="none" stroke="#0D2330" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="header-title">CodeGuard AI</div>
  </div>

  <div class="card">
    <div class="card-title">Runtime Safety</div>
    <div class="label">Current Mode</div>
    <div class="value">${mode}</div>
    <div class="label">Last Run</div>
    <div class="value" style="font-size:12px;">${lastRun}</div>
    <span class="badge badge-${riskLabel.toLowerCase()}">Risk Level: ${riskLabel}</span>
  </div>

  <div class="card">
    <div class="card-title">Issue Snapshot</div>
    <div class="label">Issues Detected</div>
    <div class="value">${bugs} total</div>
    <div class="label">High Severity</div>
    <div class="value" style="color: ${high > 0 ? 'var(--vscode-errorForeground, #ff6347)' : 'inherit'};">${high}</div>
    <div class="label">Risk Score</div>
    <div class="value">${risk}%</div>
  </div>

  <div class="row">
    <a class="btn" href="command:codeguard-ai.analyzeCurrentFile">Analyze</a>
    <a class="btn btn-secondary" href="command:codeguard-ai.explainSelection">Explain</a>
  </div>
  <div class="row">
    <a class="btn btn-secondary" href="command:codeguard-ai.applyAutoFix">Auto Fix</a>
    <a class="btn btn-secondary" href="command:codeguard-ai.safeRunFile">Safe Run</a>
  </div>
  <div class="note">Tip: Use Safe Run (Ctrl+F5) to verify runtime exceptions in Python & JS files before execution.</div>
</body>
</html>`;
  }
}

module.exports = {
  CodeGuardSidebarViewProvider
};
