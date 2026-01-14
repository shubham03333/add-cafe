import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const GoogleReviewQR = ({ size = 80 }) => {
  const googleReviewUrl = 'https://g.page/r/Cee6MqtEPab6EAE/review';

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
