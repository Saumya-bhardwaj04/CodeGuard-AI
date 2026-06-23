# CodeGuard AI VS Code Extension Guide

This guide walks you through testing, packaging, and publishing the newly copied **CodeGuard AI** VS Code extension.

---

## 1. Local Testing and Development

To test the extension locally:
1. Open the `codeguard-ai-extension` folder in a new VS Code window.
2. Make sure your CodeGuard AI backend is running (e.g., at `http://localhost:3001`).
3. Press **F5** in VS Code. This will open a new window called the **Extension Development Host**.
4. In the Extension Development Host window:
   - Open a project or create a test file (e.g., a JavaScript file with buggy code).
   - Press `Ctrl + Shift + P` to open the Command Palette and run `CodeGuard AI: Analyze Current File`.
   - The analysis results will be displayed in the results webview panel and the sidebar!

---

## 2. Packaging the Extension (`.vsix`)

Before publishing, you must compile and package the extension into a `.vsix` file.

1. Open your terminal in the `codeguard-ai-extension` directory.
2. Run the packaging script:
   ```bash
   npm run package:local
   ```
3. This generates a file named `codeguard-ai-extension-0.0.1.vsix` in the directory. You can distribute this file directly to others, who can install it manually in VS Code via:
   - Command Palette (`Ctrl + Shift + P`) $\rightarrow$ **Extensions: Install from VSIX...**

---

## 3. Publishing to the VS Code Marketplace

To publish your extension so anyone can download it from the VS Code Marketplace:

### Step 1: Create a Microsoft Account
If you don't have one, sign up for a Microsoft Account at [Microsoft Live](https://login.live.com/).

### Step 2: Create an Azure DevOps Organization
1. Go to [Azure DevOps](https://aex.dev.azure.com/) and sign in with your Microsoft account.
2. Create a new organization (e.g., `codeguard-ai-org`).

### Step 3: Generate a Personal Access Token (PAT)
1. In your Azure DevOps organization page, click the **User Settings** icon in the top-right corner next to your profile picture and select **Personal access tokens**.
2. Click **New Token**.
3. Configure the token:
   - **Name**: `vsce-publisher` (or any name you prefer)
   - **Organization**: Select **All accessible organizations** (this is required).
   - **Expiration**: Set to 90 days or custom duration.
   - **Scopes**: Select **Custom defined**, scroll down to find **Marketplace**, and check **Acquire** and **Manage**.
4. Click **Create** and **copy the PAT key immediately** (it will not be shown again).

### Step 4: Create a Marketplace Publisher
1. Go to the [Visual Studio Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage).
2. Sign in with the same Microsoft account.
3. Click **Create Publisher** and fill in your details:
   - **ID**: A unique identifier for your publisher name (e.g., `codeguard-ai`).
   - **Name**: The display name for the publisher.
4. Update `package.json` in your extension project:
   - Replace `"publisher": "local"` with your new publisher ID (e.g., `"publisher": `"codeguard-ai"`).

### Step 5: Publish the Extension
You can publish either via the command line or manually.

#### Option A: Command Line (Recommended)
1. Log in to your publisher profile from your terminal:
   ```bash
   npx @vscode/vsce login <your-publisher-id>
   ```
   Paste the Personal Access Token (PAT) when prompted.
2. Publish your extension:
   ```bash
   npx @vscode/vsce publish
   ```

#### Option B: Manual Web Upload
1. Go to the [Visual Studio Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage).
2. Select your publisher.
3. Drag and drop your packaged `codeguard-ai-extension-0.0.1.vsix` file into the portal to upload and publish it.
