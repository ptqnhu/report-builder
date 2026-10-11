import { createDeflateRaw } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf, crc = 0) {
  crc = ~crc >>> 0;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}

/** Deflates the pieces one at a time, so a large sheet is never held as one uncompressed string. */
async function deflate(pieces) {
  const z = createDeflateRaw();
  const out = [];
  z.on("data", (b) => out.push(b));
  const done = new Promise((resolve, reject) => { z.on("end", resolve); z.on("error", reject); });
  let crc = 0, size = 0;
  for (const piece of pieces) {
    const buf = Buffer.from(piece, "utf8");
    crc = crc32(buf, crc);
    size += buf.length;
    if (!z.write(buf)) await new Promise((r) => z.once("drain", r));
  }
  z.end();
  await done;
  return { data: Buffer.concat(out), crc, size };
}

/**
 * A .zip file (as used by .xlsx) from [{ name, pieces }], where pieces is an iterable of strings.
 * Plain zip, no zip64, so each file must stay under 4 GB uncompressed.
 */
export async function zip(files) {
  const locals = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const { data, crc, size } = await deflate(f.pieces);
    if (size > 0xffffffff) throw new Error("The export is too large for one file.");

    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed
    head.writeUInt16LE(0x0800, 6); // UTF-8 names
    head.writeUInt16LE(8, 8); // deflate
    head.writeUInt32LE(0x00210000, 10); // time 00:00, date 1980-01-01
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(size, 22);
    head.writeUInt16LE(name.length, 26);
    locals.push(head, name, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(0x00210000, 12);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(size, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += head.length + name.length + data.length;
  }
  const dirSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dirSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}
