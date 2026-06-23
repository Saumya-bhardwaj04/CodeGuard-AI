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
      padding: 10px;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, "Segoe UI", sans-serif);
      background-color: var(--vscode-sideBar-background, #1e1e1e);
      font-size: var(--vscode-font-size, 13px);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-divider, rgba(255,255,255,0.1));
    }
    .header svg {
      width: 28px;
      height: 28px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--vscode-sideBarTitle-foreground, #ffffff);
    }
    .card {
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.08));
      border-radius: 6px;
      padding: 10px 12px;
      background: var(--vscode-editor-background, rgba(255,255,255,0.02));
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .card-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground, #969696);
    }
    .label {
      font-size: 11px;
      opacity: 0.8;
      color: var(--vscode-descriptionForeground, #888888);
      margin-top: 6px;
    }
    .value {
      font-weight: 600;
      font-size: 14px;
      color: var(--vscode-editor-foreground, #ffffff);
    }
    .badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge-critical {
      background-color: var(--vscode-errorForeground, #f48771);
      color: #000000;
    }
    .badge-high {
      background-color: #f28500;
      color: #ffffff;
    }
    .badge-moderate {
      background-color: var(--vscode-editorWarning-foreground, #cca700);
      color: #000000;
    }
    .badge-low {
      background-color: var(--vscode-editorInfo-foreground, #75beff);
      color: #000000;
    }
    .row {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .btn {
      flex: 1;
      text-decoration: none;
      text-align: center;
      padding: 7px 10px;
      border-radius: 4px;
      color: var(--vscode-button-foreground, #ffffff);
      background-color: var(--vscode-button-background, #0e639c);
      font-weight: 500;
      font-size: 12px;
      border: 1px solid var(--vscode-button-border, transparent);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .btn:hover {
      background-color: var(--vscode-button-hoverBackground, #1177bb);
    }
    .btn-secondary {
      color: var(--vscode-button-secondaryForeground, #ffffff);
      background-color: var(--vscode-button-secondaryBackground, #3a3d41);
    }
    .btn-secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    .note {
      margin-top: 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888888);
      line-height: 1.4;
      border-left: 2px solid var(--vscode-button-background, #0e639c);
      padding-left: 6px;
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
