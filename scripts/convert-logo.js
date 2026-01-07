const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogoToAscii() {
  try {
    // Read the image
    const imagePath = path.join(__dirname, '..', 'public', 'addbilllogo.png');
    const imageBuffer = fs.readFileSync(imagePath);

    // Resize and convert to grayscale
    const resizedBuffer = await sharp(imageBuffer)
      .resize(32, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .greyscale()
      .raw()
      .toBuffer();

    // ASCII characters from darkest to lightest
    const asciiChars = '@%#*+=-:. ';

    let asciiArt = '';

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 32; x++) {
        const pixelIndex = y * 32 + x; // 1 byte per pixel for greyscale
        const brightness = resizedBuffer[pixelIndex];

        // Map brightness to ASCII character
        const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
        asciiArt += asciiChars[charIndex];
      }
      asciiArt += '\n';
    }

    console.log(asciiArt);
  } catch (error) {
    console.error('Error converting logo:', error);
  }
}

convertLogoToAscii();
