import { useEffect, useState } from 'react';
import { useGitHubAuthStore, GitHubAPIClient, GitHubRepository } from '../../integrations/github';

export function GitHubRepositoriesScreen() {
  const { accessToken, user, logout } = useGitHubAuthStore();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const loadRepositories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const client = new GitHubAPIClient(accessToken);
        const repos = await client.getUserRepositories();
        setRepositories(repos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repositories');
      } finally {
        setIsLoading(false);
      }
    };

    loadRepositories();
  }, [accessToken]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">リポジトリ</h1>
            {user && (
              <p className="text-slate-400 mt-2">
                {user.name || user.login} ({user.public_repos} public repos)
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : repositories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">リポジトリがありません</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {repositories.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-white">
                      {repo.full_name}
                    </h2>
                    {repo.description && (
                      <p className="text-slate-400 text-sm mt-1">{repo.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      {repo.language && <span>Language: {repo.language}</span>}
                      <span>⭐ {repo.stargazers_count}</span>
                      <span>Updated: {new Date(repo.updated_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  {repo.private && (
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 text-xs rounded">
                      Private
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
