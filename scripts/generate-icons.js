/**
 * Generate PWA icons from SVG using canvas
 * Creates properly sized 192x192 and 512x512 PNG icons
 */

const fs = require("fs");
const path = require("path");

// We'll create simple but valid PNG icons programmatically
// Since we can't use sharp/canvas easily, we'll use a pure JS PNG encoder

function createPNGIcon(size) {
  // Simple PNG creation using raw RGBA data
  const { createCanvas } = require("canvas");
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background gradient (blue)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#3b82f6");
  grad.addColorStop(1, "#1d4ed8");

  // Rounded rectangle background
  const radius = size * 0.22; // ~112/512
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Scale factor
  const s = size / 512;

  // 3D Box - Top Face
  const topGrad = ctx.createLinearGradient(132 * s, 130 * s, 380 * s, 130 * s);
  topGrad.addColorStop(0, "#60a5fa");
  topGrad.addColorStop(1, "#93c5fd");
  ctx.beginPath();
  ctx.moveTo(256 * s, 130 * s);
  ctx.lineTo(380 * s, 200 * s);
  ctx.lineTo(256 * s, 270 * s);
  ctx.lineTo(132 * s, 200 * s);
  ctx.closePath();
  ctx.fillStyle = topGrad;
  ctx.fill();

  // Left Face
  const leftGrad = ctx.createLinearGradient(132 * s, 200 * s, 132 * s, 400 * s);
  leftGrad.addColorStop(0, "#2563eb");
  leftGrad.addColorStop(1, "#1d4ed8");
  ctx.beginPath();
  ctx.moveTo(132 * s, 200 * s);
  ctx.lineTo(256 * s, 270 * s);
  ctx.lineTo(256 * s, 400 * s);
  ctx.lineTo(132 * s, 330 * s);
  ctx.closePath();
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // Right Face
  const rightGrad = ctx.createLinearGradient(380 * s, 200 * s, 380 * s, 400 * s);
  rightGrad.addColorStop(0, "#1d4ed8");
  rightGrad.addColorStop(1, "#1e3a8a");
  ctx.beginPath();
  ctx.moveTo(256 * s, 270 * s);
  ctx.lineTo(380 * s, 200 * s);
  ctx.lineTo(380 * s, 330 * s);
  ctx.lineTo(256 * s, 400 * s);
  ctx.closePath();
  ctx.fillStyle = rightGrad;
  ctx.fill();

  // Center highlight
  ctx.beginPath();
  ctx.moveTo(256 * s, 200 * s);
  ctx.lineTo(318 * s, 235 * s);
  ctx.lineTo(256 * s, 270 * s);
  ctx.lineTo(194 * s, 235 * s);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fill();

  // Center line
  ctx.beginPath();
  ctx.moveTo(256 * s, 270 * s);
  ctx.lineTo(256 * s, 130 * s);
  ctx.strokeStyle = "rgba(29, 78, 216, 0.3)";
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

// Try with canvas package first, fallback to a simpler approach
try {
  require.resolve("canvas");
  
  const icon192 = createPNGIcon(192);
  const icon512 = createPNGIcon(512);
  
  fs.writeFileSync(path.join(__dirname, "../public/icon-192.png"), icon192);
  fs.writeFileSync(path.join(__dirname, "../public/icon-512.png"), icon512);
  
  console.log("✅ Icons generated successfully!");
  console.log(`   icon-192.png: ${icon192.length} bytes`);
  console.log(`   icon-512.png: ${icon512.length} bytes`);
} catch (e) {
  console.log("canvas package not available, using HTML canvas approach...");
  console.log("Creating a simple valid PNG manually...");
  
  // Create minimal valid PNG files using raw bytes
  // This creates a simple solid blue square icon
  
  function createMinimalPNG(size) {
    const pako = (() => {
      try { return require("pako"); } catch { return null; }
    })();
    
    // If we don't have pako either, we'll write an uncompressed PNG
    // PNG structure: signature + IHDR + IDAT + IEND
    
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);  // width
    ihdrData.writeUInt32BE(size, 4);  // height
    ihdrData[8] = 8;   // bit depth
    ihdrData[9] = 2;   // color type (RGB)
    ihdrData[10] = 0;  // compression
    ihdrData[11] = 0;  // filter
    ihdrData[12] = 0;  // interlace
    
    const ihdr = createChunk("IHDR", ihdrData);
    
    // Create raw image data (filter byte + RGB per pixel per row)
    const rowBytes = 1 + size * 3; // filter byte + RGB
    const rawData = Buffer.alloc(rowBytes * size);
    
    for (let y = 0; y < size; y++) {
      const rowOffset = y * rowBytes;
      rawData[rowOffset] = 0; // no filter
      
      for (let x = 0; x < size; x++) {
        const px = rowOffset + 1 + x * 3;
        // Blue gradient background: #3b82f6 to #1d4ed8
        const t = (x + y) / (size * 2);
        rawData[px] = Math.round(59 + (29 - 59) * t);     // R
        rawData[px + 1] = Math.round(130 + (78 - 130) * t); // G  
        rawData[px + 2] = Math.round(246 + (216 - 246) * t); // B
      }
    }
    
    // Compress with zlib
    const zlib = require("zlib");
    const compressed = zlib.deflateSync(rawData);
    
    const idat = createChunk("IDAT", compressed);
    const iend = createChunk("IEND", Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdr, idat, iend]);
  }
  
  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeBuffer, data]);
    
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    
    return Buffer.concat([length, typeBuffer, data, crc]);
  }
  
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  
  const icon192 = createMinimalPNG(192);
  const icon512 = createMinimalPNG(512);
  
  fs.writeFileSync(path.join(__dirname, "../public/icon-192.png"), icon192);
  fs.writeFileSync(path.join(__dirname, "../public/icon-512.png"), icon512);
  
  console.log("✅ Icons generated successfully (minimal PNG)!");
  console.log(`   icon-192.png: ${icon192.length} bytes`);
  console.log(`   icon-512.png: ${icon512.length} bytes`);
}
