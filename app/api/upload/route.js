import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);

        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });

        // 필요한 파일 경로 설정
        const targetFiles = [
            'connections/followers_and_following/followers_1.json',
            'connections/followers_and_following/following.json',
        ];

        targetFiles.forEach((targetPath) => {
            const entry = zip.getEntry(targetPath);
            if (entry) {
                const content = zip.readAsText(entry);
                const outputPath = path.join(tempDir, path.basename(targetPath));
                fs.writeFileSync(outputPath, content);
                console.log(`Extracted ${targetPath} to ${outputPath}`);
            } else {
                console.error(`${targetPath} not found in ZIP.`);
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
