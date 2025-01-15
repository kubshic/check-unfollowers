import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const tempDir = path.join(process.cwd(), 'temp');

        // followers_1.json과 following.json 파일 경로
        const followersPath = path.join(tempDir, 'followers_1.json');
        const followingPath = path.join(tempDir, 'following.json');

        if (!fs.existsSync(followersPath) || !fs.existsSync(followingPath)) {
            return NextResponse.json(
                { error: 'followers_1.json 또는 following.json 파일이 없습니다.' },
                { status: 404 }
            );
        }

        const followersData = JSON.parse(fs.readFileSync(followersPath, 'utf-8'));
        const followingData = JSON.parse(fs.readFileSync(followingPath, 'utf-8'));

        // followers_1과 following에서 "value" 필드 값 추출
        const extractValues = (data) => {
            const values = [];
            const traverse = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(traverse);
                } else if (obj && typeof obj === 'object') {
                    if (obj.value) values.push(obj.value);
                    Object.values(obj).forEach(traverse);
                }
            };
            traverse(data);
            return values;
        };

        const followersValues = new Set(extractValues(followersData));
        const followingValues = extractValues(followingData);

        // 언팔 리스트 계산
        const unfollowList = followingValues.filter((user) => !followersValues.has(user));

        return NextResponse.json({
            unfollowList,
            followersData,
            followingData,
        });
    } catch (error) {
        console.error('Error processing results:', error);
        return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
