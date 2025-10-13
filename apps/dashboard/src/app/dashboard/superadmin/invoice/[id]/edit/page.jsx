import { CONFIG } from 'src/global-config';

import { InvoiceEditViewContainer } from 'src/sections/invoice/view/invoice-edit-view-container';

// ----------------------------------------------------------------------

export const metadata = { title: `Invoice edit | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }) {
  const { id } = await params;

  return <InvoiceEditViewContainer invoiceId={id} />;
}

// ----------------------------------------------------------------------

/**
 * Static Exports in Next.js
 *
 * 1. Set `isStaticExport = true` in `next.config.{mjs|ts}`.
 * 2. This allows `generateStaticParams()` to pre-render dynamic routes at build time.
 *
 * For more details, see:
 * https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 *
 * NOTE: Remove all "generateStaticParams()" functions if not using static exports.
 */
// export async function generateStaticParams() {
//   const data = CONFIG.isStaticExport ? _invoices : _invoices.slice(0, 1);

//   return data.map((invoice) => ({
//     id: invoice.id,
//   }));
// }
