export function buildSeoUrl(siteUrl: string, pagePath: string) {
  const base = new URL(siteUrl);
  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const url = new URL(normalizedPath || '/', base);
  url.search = '';
  url.hash = '';
  return url.toString();
}
