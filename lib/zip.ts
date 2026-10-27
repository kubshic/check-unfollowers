// 브라우저 내장 DecompressionStream만으로 ZIP에서 필요한 파일만 꺼낸다.
// 중앙 디렉터리만 읽고 필요한 항목만 잘라 풀기 때문에, 사진·영상이 포함된 수 GB짜리
// 인스타그램 내보내기 파일도 전체를 메모리에 올리지 않는다.

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
  modified: Date;
  encrypted: boolean;
};

const bytes = async (file: Blob, start: number, end: number) =>
  new DataView(await file.slice(start, end).arrayBuffer());

const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

export async function listZip(file: Blob): Promise<ZipEntry[]> {
  const tailStart = Math.max(0, file.size - 65557);
  const tail = await bytes(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP 파일 형식이 아니에요.");

  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const loc = eocd - 20;
    if (loc < 0 || tail.getUint32(loc, true) !== 0x07064b50) throw new Error("지원하지 않는 ZIP 형식이에요.");
    const z64 = await bytes(file, u64(tail, loc + 8), u64(tail, loc + 8) + 56);
    cdSize = u64(z64, 40);
    cdOffset = u64(z64, 48);
  }

  const cd = await bytes(file, cdOffset, cdOffset + cdSize);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let p = 0;
  while (p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50) {
    const flags = cd.getUint16(p + 8, true);
    const method = cd.getUint16(p + 10, true);
    const time = cd.getUint16(p + 12, true);
    const date = cd.getUint16(p + 14, true);
    let compressedSize = cd.getUint32(p + 20, true);
    const uncompressed = cd.getUint32(p + 24, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    let localOffset = cd.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));

    // ZIP64 확장 필드: 0xFFFFFFFF로 표시된 값만 순서대로 들어 있다.
    let e = p + 46 + nameLen;
    const extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      const id = cd.getUint16(e, true);
      const size = cd.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (uncompressed === 0xffffffff) q += 8;
        if (compressedSize === 0xffffffff) (compressedSize = u64(cd, q)), (q += 8);
        if (localOffset === 0xffffffff) localOffset = u64(cd, q);
      }
      e += 4 + size;
    }

    entries.push({
      name,
      method,
      compressedSize,
      localOffset,
      encrypted: (flags & 1) === 1,
      modified: new Date(
        1980 + (date >> 9),
        ((date >> 5) & 15) - 1,
        date & 31,
        time >> 11,
        (time >> 5) & 63,
        (time & 31) * 2,
      ),
    });
    p = extraEnd + commentLen;
  }
  return entries;
}

export async function readZipText(file: Blob, entry: ZipEntry): Promise<string> {
  if (entry.encrypted) throw new Error("암호가 걸린 ZIP은 읽을 수 없어요.");
  const head = await bytes(file, entry.localOffset, entry.localOffset + 30);
  const start = entry.localOffset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
  const data = file.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return data.text();
  if (entry.method !== 8) throw new Error(`지원하지 않는 압축 방식이에요 (${entry.method}).`);
  return new Response(data.stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
}
