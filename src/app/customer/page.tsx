import CustomerPageClient from './CustomerPageClient';

export default function CustomerPage() {
  if (process.env.CUSTOMER_ORDERING_ENABLED !== 'true') {
    const catalog = process.env.NEXT_PUBLIC_CATALOG_URL || '';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900">Order via QR menu</h1>
          <p className="mt-3 text-gray-600">
            Customer ordering on this POS site is turned off. Scan the table QR to open the digital catalog.
          </p>
          {catalog ? (
            <a href={catalog} className="mt-6 inline-block rounded-xl bg-red-700 px-4 py-3 font-semibold text-white">
              Open catalog
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return <CustomerPageClient />;
}
