import fs from "fs";
import zlib from "zlib";

function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk("IHDR", ihdr);

  // Scanlines (raw pixel data: dark blue background with electric blue accent)
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte for scanline
    for (let x = 0; x < width; x++) {
      // Rounded icon background with blue gradient
      const cx = x - width / 2;
      const cy = y - height / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = width * 0.45;

      if (dist < radius) {
        // Gradient from bright electric blue to deep slate
        const factor = y / height;
        rawData.writeUInt8(Math.floor(37 * (1 - factor) + 15 * factor), offset++); // R
        rawData.writeUInt8(Math.floor(99 * (1 - factor) + 23 * factor), offset++); // G
        rawData.writeUInt8(Math.floor(235 * (1 - factor) + 42 * factor), offset++); // B
        rawData.writeUInt8(255, offset++); // Alpha
      } else {
        // Transparent outside
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconBuffer = createPNG(512, 512);
fs.writeFileSync("app-icon.png", iconBuffer);
console.log("Created app-icon.png (512x512)");
