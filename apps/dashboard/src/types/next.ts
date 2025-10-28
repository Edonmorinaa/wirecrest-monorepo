import { NextPage } from 'next';
import { AppProps } from 'next/app';
import { Session } from '@wirecrest/auth-next';
import { ReactNode, ReactElement } from 'react';

export type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
  pageProps: {
    session?: Session;
  };
};

export type NextPageWithLayout<P = Record<string, unknown>> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};
