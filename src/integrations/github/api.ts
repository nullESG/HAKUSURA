import { GITHUB_API_BASE } from './constants';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
}

export class GitHubAPIClient {
  constructor(private accessToken: string) {}

  async getUser(): Promise<GitHubUser> {
    return (await this.request('/user')) as GitHubUser;
  }

  async getUserRepositories(): Promise<GitHubRepository[]> {
    return (await this.request('/user/repos', {
      params: {
        sort: 'updated',
        per_page: 30,
      },
    })) as GitHubRepository[];
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return (await this.request(`/repos/${owner}/${repo}`)) as GitHubRepository;
  }

  async searchRepositories(query: string): Promise<{ items: GitHubRepository[] }> {
    return (await this.request('/search/repositories', {
      params: { q: query, per_page: 30 },
    })) as { items: GitHubRepository[] };
  }

  private async request(
    endpoint: string,
    options?: {
      params?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    const url = new URL(`${GITHUB_API_BASE}${endpoint}`);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
