import { useEffect } from 'react';
import { useGitHubAuthStore } from '../../integrations/github';
import { exchangeCodeForToken, GitHubAPIClient } from '../../integrations/github';

export function GitHubCallbackScreen() {
  const { setAccessToken, setUser, setError, setIsLoading } = useGitHubAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          setError(`Authorization failed: ${error}`);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          return;
        }

        const accessToken = await exchangeCodeForToken(code);
        localStorage.setItem('github_access_token', accessToken);
        setAccessToken(accessToken);

        const client = new GitHubAPIClient(accessToken);
        const user = await client.getUser();
        setUser(user);

        localStorage.removeItem('github_code_verifier');

        window.location.href = '/';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth callback failed');
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [setAccessToken, setUser, setError, setIsLoading]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">ログイン処理中...</p>
      </div>
    </div>
  );
}
