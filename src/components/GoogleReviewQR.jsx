import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const FALLBACK_GOOGLE_URL = 'https://g.page/r/Cee6MqtEPab6EAE/review';

const GoogleReviewQR = ({ size = 80, tableCode }) => {
  const template = process.env.NEXT_PUBLIC_CATALOG_REVIEW_URL_TEMPLATE;
  const googleReviewUrl =
    tableCode && template
      ? template.replace(/\{table\}/g, String(tableCode))
      : FALLBACK_GOOGLE_URL;

  return (
    <div className="flex flex-col items-center justify-center my-2 print:my-1">
      <QRCodeCanvas
        value={googleReviewUrl}
        size={size}
        level="M"
        includeMargin={false}
        className="print:block"
      />
      <p className="text-xs text-center text-gray-600 print:text-black mt-1 print:mt-0.5">
        Scan to rate us on Google!
      </p>
    </div>
  );
};

export default GoogleReviewQR;
