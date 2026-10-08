// The workspace is the home of the admin area. The portfolio's own admin pages live inside it as a section.
export const PORTFOLIO_TABS = [
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/sources', label: 'Sources' },
  { href: '/admin/categories', label: 'Kategori' },
  { href: '/admin/todos', label: 'Todos' },
] as const;

export const isPortfolioPath = (pathname: string) => PORTFOLIO_TABS.some(t => pathname.startsWith(t.href));
export const isToolsPath = (pathname: string) => pathname.startsWith('/admin/workspaces/tools');

/** Fired after something the dashboard shows has changed (new client, new todo). */
export const WORKSPACE_CHANGED = 'workspace:changed';
