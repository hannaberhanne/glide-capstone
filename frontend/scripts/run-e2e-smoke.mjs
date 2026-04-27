import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = path.resolve(process.cwd(), '../test-results/e2e');
const CONTEXT_PATH = path.join(OUTPUT_DIR, 'context.json');

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function waitForPageReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function fillSignup(page, email, password) {
  console.log('Step: signup');
  await page.goto(`${BASE_URL}/signup`);
  await waitForPageReady(page);

  await page.getByLabel('First Name').fill('E2E');
  await page.getByLabel('Last Name').fill('Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await screenshot(page, 'signup');
  await page.getByRole('button', { name: 'SIGN UP' }).click();
  await page.waitForURL(/\/onboarding$/, { timeout: 20000 });
}

async function completeOnboarding(page) {
  console.log('Step: onboarding');
  for (let step = 1; step <= 4; step += 1) {
    await page.locator('.onboarding-option').first().click();
    await page.getByRole('button', { name: /Next/ }).click();
  }

  await page.locator('.onboarding-textarea').fill('Launch my capstone polished and on time');
  await screenshot(page, 'onboarding');
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: 'No thanks' }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
}

async function addDashboardTask(page, title) {
  console.log('Step: dashboard task');
  const input = page.locator('.today-inline-input').first();
  await input.fill(title);
  await input.press('Enter');
  await page.getByText(title, { exact: true }).waitFor({ timeout: 15000 });
}

async function saveNotificationPreferences(page) {
  console.log('Step: settings preferences');
  await page.goto(`${BASE_URL}/settings?tab=preferences`);
  await waitForPageReady(page);

  const emailToggle = page.getByLabel('Enable email notifications');
  await emailToggle.check();
  await page.getByLabel('Notification timezone').fill('America/New_York');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByText('Profile updated').waitFor({ timeout: 15000 });
  await screenshot(page, 'settings-preferences');

  await page.reload();
  await waitForPageReady(page);
  await emailToggle.waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await emailToggle.isChecked()) {
      break;
    }
    await page.waitForTimeout(500);
  }
  assert.equal(await emailToggle.isChecked(), true);
}

async function generateAndReplanSchedule(page) {
  console.log('Step: planner schedule');
  await page.goto(`${BASE_URL}/planner`);
  await waitForPageReady(page);
  await page.getByRole('button', { name: 'Generate Day' }).click();
  await page.getByText(/Generated a plan for/i).waitFor({ timeout: 30000 });
  await page.locator('.planner-schedule-block').filter({ hasText: 'Cook dinner' }).first().waitFor({ timeout: 30000 });
  await screenshot(page, 'planner-generated');

  await page.getByRole('button', { name: 'Replan' }).first().click();
  await page.getByText(/Replanned/i).waitFor({ timeout: 30000 });
  await screenshot(page, 'planner-replanned');
}

async function captureSmokeScreens(page) {
  console.log('Step: smoke screenshots');
  const publicRoutes = [
    ['landing', '/'],
    ['login', '/login'],
    ['forgot-password', '/forgot-password'],
    ['demo', '/demo'],
  ];

  for (const [name, route] of publicRoutes) {
    await page.goto(`${BASE_URL}${route}`);
    await waitForPageReady(page);
    await screenshot(page, name);
  }

  const privateRoutes = [
    ['dashboard', '/dashboard'],
    ['planner', '/planner'],
    ['goals', '/goals'],
    ['settings-general', '/settings'],
    ['canvas-setup', '/canvas-setup'],
  ];

  for (const [name, route] of privateRoutes) {
    await page.goto(`${BASE_URL}${route}`);
    await waitForPageReady(page);
    await screenshot(page, name);
  }
}

async function getCurrentUserContext(page) {
  return page.evaluate(async () => {
    const mod = await import('/src/config/firebase.js');
    const currentUser = mod.auth.currentUser;
    if (!currentUser) {
      return null;
    }
    return {
      uid: currentUser.uid,
      email: currentUser.email,
    };
  });
}

async function main() {
  await ensureOutputDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  const timestamp = Date.now();
  const email = `glide-e2e-${timestamp}@example.com`;
  const password = 'Capstone123!';

  try {
    await captureSmokeScreens(page);
    await fillSignup(page, email, password);
    await completeOnboarding(page);
    await addDashboardTask(page, 'Cook dinner');
    await screenshot(page, 'dashboard-after-task');
    await saveNotificationPreferences(page);
    await generateAndReplanSchedule(page);
    await captureSmokeScreens(page);

    const authContext = await getCurrentUserContext(page);
    assert.ok(authContext?.uid, 'Expected authenticated user context after e2e flow');

    await fs.writeFile(
      CONTEXT_PATH,
      JSON.stringify(
        {
          ...authContext,
          password,
          generatedAt: new Date().toISOString(),
          screenshotsDir: OUTPUT_DIR,
        },
        null,
        2
      )
    );

    console.log(`E2E browser flow passed for ${authContext.email}`);
    console.log(`Context written to ${CONTEXT_PATH}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('E2E browser flow failed:', error);
  process.exitCode = 1;
});
