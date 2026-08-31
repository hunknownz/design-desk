import { expect, test } from '@playwright/test';

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
