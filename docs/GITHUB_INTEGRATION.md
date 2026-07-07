# GitHub Integration Guide

HAKUSURA は GitHub OAuth 2.0 を使用したユーザー認証とリポジトリアクセス機能を提供します。

## セットアップ手順

### 1. GitHub App の作成

1. GitHub にログインして、[Settings > Developer settings > GitHub Apps](https://github.com/settings/apps) に移動
2. **New GitHub App** をクリック
3. 以下の設定を入力：

#### 基本情報
- **GitHub App name**: `HAKUSURA` (または任意の名前)
- **Homepage URL**: あなたのアプリのホームページURL
- **Callback URL**: `http://localhost:5173/auth/github/callback` (開発環境)
  - 本番環境：`https://your-domain.com/auth/github/callback`

#### パーミッション
- **Repository permissions**:
  - Contents: Read-only (リポジトリ内容を読み込み)
  - Metadata: Read-only (必須)
- **User permissions**:
  - User email: Read-only

#### 登録デバイス
- **Where can this GitHub App be installed?** → "Any account" を選択

### 2. 環境変数の設定

`.env` ファイルを作成して以下を設定：

```env
VITE_GITHUB_CLIENT_ID=Ov23liXXXXXXXXXXXXXX
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback
```

Client ID は GitHub App の設定ページから確認できます。

### 3. 開発サーバーの起動

```bash
npm install
npm run dev
```

## 使用方法

### ユーザーフロー

1. **GitHub ログイン**
   - `GitHubLoginScreen` で「GitHub でログイン」ボタンをクリック
   - GitHub の認可画面でパーミッションを確認・承認

2. **OAuth コールバック**
   - `GitHubCallbackScreen` がコールバック URL でアクセストークンを取得
   - アクセストークンを localStorage に保存
   - ユーザー情報を取得して状態管理に登録

3. **リポジトリ表示**
   - `GitHubRepositoriesScreen` でユーザーの GitHub リポジトリ一覧を表示
   - リポジトリ情報（説明、言語、スター数など）を表示可能

## API

### `GitHubAPIClient`

```typescript
const client = new GitHubAPIClient(accessToken);

// ユーザー情報取得
const user = await client.getUser();

// リポジトリ一覧取得
const repos = await client.getUserRepositories();

// 特定リポジトリ取得
const repo = await client.getRepository('owner', 'repo-name');

// リポジトリ検索
const results = await client.searchRepositories('language:javascript');
```

### `useGitHubAuthStore`

```typescript
const {
  accessToken,       // OAuth アクセストークン
  user,              // ユーザー情報
  isAuthenticated,   // 認証済みかどうか
  isLoading,         // ローディング中かどうか
  error,             // エラーメッセージ

  startOAuthFlow,    // OAuth フロー開始
  logout,            // ログアウト
  setAccessToken,    // トークン設定
  setUser,           // ユーザー情報設定
  loadFromStorage,   // localStorage から復元
} = useGitHubAuthStore();
```

## セキュリティ考慮事項

### PKCE (Proof Key for Code Exchange)

このアプリケーションは OAuth 2.0 PKCE フローを使用しており、クライアント側でコード検証を行う安全な方式を採用しています。

- `code_verifier`: ランダムに生成された文字列
- `code_challenge`: SHA-256 ハッシュ値をBase64Url エンコード
- `code_challenge_method`: S256

### 注意点

⚠️ **本番環境での注意**

現在のトークン交換処理はクライアント側で行われています。クライアントシークレットは GitHub のコード交換エンドポイントに送信されます。

本番環境では以下を推奨します：
1. バックエンド サーバーを経由してトークン交換を行う
2. クライアントシークレットをサーバー側で安全に保管する
3. HTTPS を使用する

## トラブルシューティング

### CORS エラーが表示される

GitHub API への CORS リクエストがブロックされる場合、以下をご確認ください：

1. GitHub App の設定で Redirect URI が正しく設定されているか
2. ネットワーク設定でプロキシを使用していないか

### "Code verifier not found" エラー

- ブラウザの localStorage が有効になっているか確認
- キャッシュをクリアして再度ログインを試す

## 参考リンク

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [GitHub API Documentation](https://docs.github.com/en/rest)
