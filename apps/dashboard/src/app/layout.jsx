import 'src/global.css';

import { AuthWrapper } from '@wirecrest/auth';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import { CONFIG } from 'src/global-config';
import { LocalizationProvider } from 'src/locales';
import { detectLanguage } from 'src/locales/server';
import { I18nProvider } from 'src/locales/i18n-provider';
import { TeamProvider } from 'src/contexts/tenant-context';
import { StripeDataProvider } from 'src/contexts/StripeDataContext';
import { themeConfig, ThemeProvider, primary as primaryColor } from 'src/theme';

import { Snackbar } from 'src/components/snackbar';
import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { detectSettings } from 'src/components/settings/server';
import { SubdomainRedirect } from 'src/components/subdomain-redirect';
import { PushNotificationPrompt } from 'src/components/push-notification-prompt';
import { GlobalNotificationListener } from 'src/components/global-notification-listener';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { CheckoutProvider } from 'src/sections/checkout/context';

// ----------------------------------------------------------------------

// Use @wirecrest/auth for all authentication
const AuthProvider = AuthWrapper;

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primaryColor.main,
};

export const metadata = {
  icons: [
    {
      rel: 'icon',
      url: `${CONFIG.assetsDir}/favicon.ico`,
    },
  ],
};

// ----------------------------------------------------------------------

async function getAppConfig() {
  if (CONFIG.isStaticExport) {
    return {
      lang: 'en',
      i18nLang: undefined,
      cookieSettings: undefined,
      dir: defaultSettings.direction,
    };
  } else {
    const [lang, settings] = await Promise.all([detectLanguage(), detectSettings()]);

    return {
      lang,
      i18nLang: lang,
      cookieSettings: settings,
      dir: settings.direction,
    };
  }
}

export default async function RootLayout({ children }) {
  const appConfig = await getAppConfig();

  return (
    <html lang={appConfig.lang} dir={appConfig.dir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <InitColorSchemeScript
          modeStorageKey={themeConfig.modeStorageKey}
          attribute={themeConfig.cssVariables.colorSchemeSelector}
          defaultMode={themeConfig.defaultMode}
        />

        <I18nProvider lang={appConfig.i18nLang}>
          <AuthProvider>
            <TeamProvider>
              <SubdomainRedirect>
                <SettingsProvider
                  defaultSettings={defaultSettings}
                  cookieSettings={appConfig.cookieSettings}
                >
                  <LocalizationProvider>
                    <AppRouterCacheProvider options={{ key: 'css' }}>
                      <ThemeProvider
                        modeStorageKey={themeConfig.modeStorageKey}
                        defaultMode={themeConfig.defaultMode}
                      >
                        <MotionLazy>
                          <CheckoutProvider>
                            <StripeDataProvider>
                              <GlobalNotificationListener />
                              <Snackbar />
                              <ProgressBar />
                              <PushNotificationPrompt />
                              <SettingsDrawer defaultSettings={defaultSettings} />
                              {children}
                            </StripeDataProvider>
                          </CheckoutProvider>
                        </MotionLazy>
                      </ThemeProvider>
                    </AppRouterCacheProvider>
                  </LocalizationProvider>
                </SettingsProvider>
              </SubdomainRedirect>
            </TeamProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
