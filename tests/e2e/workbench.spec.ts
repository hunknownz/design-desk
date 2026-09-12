import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('您的姓名').fill('Reviewer');
  await page.getByLabel('访问码').fill('test-review-code');
  await page.getByRole('button', { name: '进入设计台' }).click();
}

async function seedPrimaryActionAnnotation(page: import('@playwright/test').Page) {
  const response = await page.evaluate(async () => {
    const state = await fetch('/api/state').then((result) => result.json());
    await Promise.all(state.annotations.map((annotation: { id: string }) => fetch(`/api/annotations/${encodeURIComponent(annotation.id)}`, { method: 'DELETE' })));
    return fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: 'home', taskId: null, x: .82, y: .04, w: .08, h: .05,
        viewportWidth: 1280, viewport: 'desktop', selectionType: 'element',
        elementLabel: '页面顶栏 · Primary action', elementPath: 'header > a.action',
        locationLabel: '页面顶栏', targetId: 'primary-action', demoVersion: 'sample-v1',
        note: 'Synthetic marker motion regression fixture.'
      })
    }).then((result) => result.json());
  });
  expect(response.id).toBeTruthy();
  await page.reload();
}

test('requires login and opens the client-neutral sample preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Design Desk' })).toBeVisible();
  await page.getByLabel('您的姓名').fill('Reviewer');
  await page.getByLabel('访问码').fill('test-review-code');
  await page.getByRole('button', { name: '进入设计台' }).click();

  await expect(page.locator('.desk-brand')).toHaveText('Design Desk');
  const demo = page.frameLocator('iframe[title="Website review preview"]');
  await expect(demo.getByRole('heading', { name: 'Website review without email chains' })).toBeVisible();
  await demo.getByRole('link', { name: 'Products' }).click();
  await expect(page.getByLabel('当前页面地址')).toContainText('/products/');
  await expect(demo.getByRole('heading', { name: 'A clear sample catalog' })).toBeVisible();
});

test('loads the optional external competitor tracker into the workbench', async ({ page }) => {
  await login(page);

  const trackerButton = page.getByRole('button', { name: '竞品追踪，共 1 个竞品' });
  await expect(trackerButton).toBeVisible();
  await trackerButton.click();

  const drawer = page.getByRole('complementary', { name: 'Competitor tracker' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Northline' })).toBeVisible();
  await expect(drawer.getByText('Client-neutral synthetic fixture.')).toBeVisible();
});

test('opening a numbered marker does not fly or shrink its real hit target', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await seedPrimaryActionAnnotation(page);

  const marker = page.getByRole('button', { name: '打开批注 #001' });
  const layer = page.locator('.annotation-layer');
  const target = page.frameLocator('.demo-frame').locator('[data-review-target="primary-action"]');
  await expect(marker).toBeVisible();
  await expect(target).not.toHaveClass(/focus-flash/);

  await marker.click();
  await expect(page.locator('.workspace')).toHaveClass(/is-review-layout-settling/);
  await expect(layer).toHaveCSS('opacity', '0');
  await expect(target).not.toHaveClass(/focus-flash/);

  await expect.poll(async () => (await marker.boundingBox())?.width || 0).toBeGreaterThanOrEqual(43.5);
  await expect.poll(async () => page.locator('.workspace').getAttribute('class')).not.toContain('is-review-layout-settling');
  await expect(layer).toHaveCSS('opacity', '1');
});

test('opening an annotation from the review list still requests website focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await seedPrimaryActionAnnotation(page);

  const target = page.frameLocator('.demo-frame').locator('[data-review-target="primary-action"]');
  await target.evaluate(() => {
    const reviewWindow = window as typeof window & { __designDeskFocusMessages?: string[] };
    reviewWindow.__designDeskFocusMessages = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'design-desk:focus-target') {
        reviewWindow.__designDeskFocusMessages?.push(event.data.targetId);
      }
    });
  });
  await page.getByRole('button', { name: '批注', exact: true }).click();
  await page.getByRole('button', { name: '批注 #001', exact: true }).click();
  await expect.poll(() => target.evaluate(() => (window as typeof window & { __designDeskFocusMessages?: string[] }).__designDeskFocusMessages || [])).toContain('primary-action');
});
