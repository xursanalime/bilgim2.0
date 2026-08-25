import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:4000';

/**
 * Faza 0 smoke suite — blank app holatining asosiy sig'iq signallari:
 *  1) API health endpoint javob beradi;
 *  2) Web root sahifa render bo'ladi va tenant dark tema tokenlari qo'llanadi.
 */
test.describe('Faza 0 — poydevor smoke', () => {
  test('API /v1/health "ok" qaytaradi', async ({ request }) => {
    const response = await request.get(`${API_BASE}/v1/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('bilgim-api');
  });

  test('API /v1/metrics prometheus formatini qaytaradi', async ({ request }) => {
    const response = await request.get(`${API_BASE}/v1/metrics`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test('root sahifa render bo‘ladi va dark canvas temasi qo‘llanadi', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Bilgim' })).toBeVisible();

    // §8.1: canvas #0A0A0F — token real qo'llanganini tekshirish
    const backgroundColor = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(backgroundColor).toBe('rgb(10, 10, 15)');
  });
});
