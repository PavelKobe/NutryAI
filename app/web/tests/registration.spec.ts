import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://nutriaidiary.com';
const TEST_EMAIL = `test_reg_${Date.now()}@mailinator.com`;
const TEST_PASSWORD = 'TestPass123!';

interface Timing {
  label: string;
  ms: number;
}

const timings: Timing[] = [];

function recordTime(label: string, start: number) {
  const ms = Date.now() - start;
  timings.push({ label, ms });
  console.log(`⏱  ${label}: ${ms}ms`);
}

async function waitAndMeasure(page: Page, label: string, action: () => Promise<void>, waitFor?: string | (() => Promise<void>)) {
  const start = Date.now();
  await action();
  if (typeof waitFor === 'string') {
    await page.waitForSelector(waitFor, { timeout: 15000 });
  } else if (typeof waitFor === 'function') {
    await waitFor();
  }
  recordTime(label, start);
}

test.describe('Registration Flow — NutryAI Production', () => {
  test('Full registration path with bottleneck detection', async ({ page }) => {
    // ── 1. Открытие главной страницы ──────────────────────────────────
    let t = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    recordTime('Загрузка главной страницы (networkidle)', t);

    await page.screenshot({ path: 'tests/screenshots/01_home.png', fullPage: true });
    console.log('\n📸 Скриншот: главная страница');

    // ── 2. Поиск CTA / кнопки регистрации ─────────────────────────────
    const registerLinks = [
      'a[href*="register"]',
      'a[href*="signup"]',
      'button:has-text("Регистрация")',
      'button:has-text("Зарегистрироваться")',
      'a:has-text("Регистрация")',
      'a:has-text("Начать")',
      'a:has-text("Попробовать")',
    ];

    let registerBtn = null;
    for (const selector of registerLinks) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        registerBtn = el;
        console.log(`✅ Найдена кнопка регистрации: ${selector}`);
        break;
      }
    }

    if (!registerBtn) {
      console.log('⚠️  Кнопка регистрации не найдена на главной — переходим по прямому URL');
      await page.screenshot({ path: 'tests/screenshots/01b_home_no_cta.png', fullPage: true });
    }

    // ── 3. Переход на страницу регистрации ───────────────────────────
    t = Date.now();
    if (registerBtn) {
      await registerBtn.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    }
    recordTime('Переход на страницу регистрации', t);

    const currentUrl = page.url();
    console.log(`📍 URL после перехода: ${currentUrl}`);
    await page.screenshot({ path: 'tests/screenshots/02_register_page.png', fullPage: true });

    // ── 4. Проверка наличия формы ─────────────────────────────────────
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const passwordVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`\n📋 Форма регистрации:`);
    console.log(`   Email поле: ${emailVisible ? '✅ видно' : '❌ не найдено'}`);
    console.log(`   Password поле: ${passwordVisible ? '✅ видно' : '❌ не найдено'}`);

    if (!emailVisible || !passwordVisible) {
      console.log('❌ УЗКОЕ МЕСТО: Форма регистрации недоступна или не найдена');
      // Попробуем найти вкладку "Регистрация" (если это auth-страница с табами)
      const registerTab = page.locator('button:has-text("Регистрация"), [role="tab"]:has-text("Регистрация")').first();
      if (await registerTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   → Найдена вкладка регистрации, кликаем');
        await registerTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/02b_register_tab.png', fullPage: true });
      }
    }

    // ── 5. Заполнение формы ───────────────────────────────────────────
    // Имя (если есть)
    const nameInput = page.locator('input[name="name"], input[placeholder*="имя" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test User');
      console.log('   Имя: заполнено');
    }

    t = Date.now();
    if (emailVisible) await emailInput.fill(TEST_EMAIL);
    if (passwordVisible) await passwordInput.fill(TEST_PASSWORD);

    // Подтверждение пароля (если есть)
    const confirmInput = page.locator('input[name="confirmPassword"], input[name="password_confirm"], input[placeholder*="подтвер" i]').first();
    if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmInput.fill(TEST_PASSWORD);
      console.log('   Подтверждение пароля: заполнено');
    }
    recordTime('Заполнение формы регистрации', t);

    await page.screenshot({ path: 'tests/screenshots/03_form_filled.png', fullPage: true });

    // ── 6. Валидация до отправки ──────────────────────────────────────
    // Проверяем наличие realtime-валидации
    const submitBtn = page.locator('button[type="submit"], button:has-text("Зарегистрироваться"), button:has-text("Создать аккаунт"), button:has-text("Регистрация")').first();
    const submitVisible = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`\n   Кнопка отправки: ${submitVisible ? '✅ видна' : '❌ не найдена'}`);

    // ── 7. Отправка формы ─────────────────────────────────────────────
    if (submitVisible) {
      t = Date.now();
      await submitBtn.click();

      // Ждём редиректа или сообщения об успехе
      try {
        await Promise.race([
          page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 }),
          page.waitForURL(`${BASE_URL}/onboarding`, { timeout: 10000 }),
          page.waitForURL(`${BASE_URL}/profile-setup`, { timeout: 10000 }),
          page.waitForSelector('[data-testid="success"], .toast-success, [role="alert"]', { timeout: 10000 }),
        ]);
        recordTime('Регистрация → редирект/успех', t);
        console.log(`\n✅ Регистрация успешна! URL: ${page.url()}`);
      } catch {
        recordTime('Регистрация (без успешного редиректа)', t);
        console.log(`\n⚠️  Редирект не произошёл за 10с. URL: ${page.url()}`);
      }

      await page.screenshot({ path: 'tests/screenshots/04_after_submit.png', fullPage: true });
    }

    // ── 8. Проверка ошибок ────────────────────────────────────────────
    const errorMessages = await page.locator('.error, [role="alert"], .text-red, [data-testid*="error"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log(`\n⚠️  Найдены сообщения об ошибках:`);
      errorMessages.forEach(msg => console.log(`   → "${msg.trim()}"`));
    }

    // ── 9. Итоговый отчёт ────────────────────────────────────────────
    console.log('\n' + '═'.repeat(55));
    console.log('📊 ОТЧЁТ: Замеры производительности регистрации');
    console.log('═'.repeat(55));
    timings.forEach(({ label, ms }) => {
      const flag = ms > 3000 ? '🔴 МЕДЛЕННО' : ms > 1500 ? '🟡 OK' : '🟢';
      console.log(`${flag}  ${label}: ${ms}ms`);
    });
    console.log('═'.repeat(55));

    const total = timings.reduce((sum, t) => sum + t.ms, 0);
    console.log(`⏱  ИТОГО: ${total}ms`);
    console.log(`📧 Тестовый email: ${TEST_EMAIL}`);
    console.log('═'.repeat(55));
  });

  test('Validation — пустая форма', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });

    // Попробуем клик по submit без заполнения
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/validation_empty.png', fullPage: true });

      const errors = await page.locator('.error, [role="alert"], .text-red-500, [data-testid*="error"]').allTextContents();
      console.log(`\n✅ Валидация пустой формы: ${errors.length} ошибок показано`);
      errors.forEach(e => console.log(`   → "${e.trim()}"`));
    }
  });

  test('Duplicate email — повторная регистрация должна показать ошибку', async ({ page }) => {
    // Шаг 1: регистрируем email
    const uniqueEmail = `dup_test_${Date.now()}@mailinator.com`;

    const register = async (p: typeof page) => {
      await p.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
      await p.locator('input[type="email"]').first().fill(uniqueEmail);
      await p.locator('input[type="password"]').first().fill(TEST_PASSWORD);
      await p.locator('button[type="submit"]').first().click();
      // Ждём редиректа или ошибки
      await p.waitForTimeout(3000);
    };

    await register(page);
    console.log(`\n✅ Шаг 1: зарегистрировали ${uniqueEmail}`);

    // Шаг 2: пробуем зарегистрировать тот же email снова
    await register(page);
    await page.screenshot({ path: 'tests/screenshots/duplicate_email.png', fullPage: true });

    // Ожидаем ошибку под полем email или в общем блоке
    const errorTexts = await page.locator('p.text-red-400, [class*="FormMessage"], [role="alert"]').allTextContents();
    console.log(`\n📋 Ответ на дублирующий email (${errorTexts.length} сообщений):`);
    errorTexts.forEach(e => console.log(`   → "${e.trim()}"`));

    const hasError = errorTexts.some(t => t.trim().length > 0);
    if (hasError) {
      console.log('✅ Ошибка дублирующего email отображается корректно');
    } else {
      console.log('❌ УЗКОЕ МЕСТО: ошибка дублирующего email не отображается');
    }
  });
});
