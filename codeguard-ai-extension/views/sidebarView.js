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
    :root {
      --bg-1: #0c2131;
      --bg-2: #0a1723;
      --accent: #7cf1ff;
      --accent-soft: rgba(124, 241, 255, 0.25);
      --text-soft: #c8dff5;
    }
    body {
      margin: 0;
      padding: 12px;
      color: #dce9f9;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background:
        radial-gradient(420px 220px at 120% -10%, rgba(124, 241, 255, 0.25), transparent 50%),
        linear-gradient(155deg, var(--bg-1) 0%, var(--bg-2) 72%);
    }
    .card {
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.04);
      margin-bottom: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.22);
    }
    .title {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #eef9ff;
    }
    .label { font-size: 12px; opacity: 0.9; margin-bottom: 4px; color: var(--text-soft); }
    .value { font-weight: 700; font-size: 16px; }
    .pill {
      display: inline-block;
      margin-top: 8px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      font-size: 12px;
      color: #ecf9ff;
    }
    .row { display: flex; gap: 8px; margin-top: 8px; }
    .btn {
      flex: 1;
      text-decoration: none;
      text-align: center;
      padding: 8px 10px;
      border-radius: 999px;
      color: #072130;
      background: var(--accent);
      font-weight: 700;
      font-size: 12px;
      border: 1px solid transparent;
      box-shadow: 0 8px 18px rgba(124, 241, 255, 0.25);
    }
    .btn.secondary {
      color: #d9f6ff;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.20);
      box-shadow: none;
    }
    .note {
      margin-top: 10px;
      font-size: 11px;
      color: var(--text-soft);
      line-height: 1.4;
      border-left: 3px solid var(--accent-soft);
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Runtime Safety</div>
    <div class="label">Current Mode</div>
    <div class="value">${mode}</div>
    <div class="label" style="margin-top:8px;">Last Run</div>
    <div class="value" style="font-size:13px;">${lastRun}</div>
    <span class="pill">Risk Level: ${riskLabel}</span>
  </div>

  <div class="card">
    <div class="title">Issue Snapshot</div>
    <div class="label">Issues</div>
    <div class="value">${bugs} total</div>
    <div class="label" style="margin-top:8px;">High Severity</div>
    <div class="value">${high}</div>
    <div class="label" style="margin-top:8px;">Risk Score</div>
    <div class="value">${risk}%</div>
  </div>

  <div class="row">
    <a class="btn" href="command:codeguard-ai.analyzeCurrentFile">Analyze</a>
    <a class="btn secondary" href="command:codeguard-ai.explainSelection">Explain</a>
  </div>
  <div class="row">
    <a class="btn secondary" href="command:codeguard-ai.applyAutoFix">Auto Fix</a>
    <a class="btn secondary" href="command:codeguard-ai.safeRunPythonFile">Safe Run</a>
  </div>
  <div class="note">Tip: Use Safe Run before executing risky Python files to prevent runtime crashes.</div>
</body>
</html>`;
  }
}

module.exports = {
  CodeGuardSidebarViewProvider
};
