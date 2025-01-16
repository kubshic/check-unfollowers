import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);

        const originalFileName = file.name;
        const dateRegex = /\d{4}-\d{2}-\d{2}/;
        const usernameRegex = /instagram-([\w._]+)-\d{4}-\d{2}-\d{2}/;

        const queryDateMatch = originalFileName.match(dateRegex);
        const usernameMatch = originalFileName.match(usernameRegex);

        const queryDate = queryDateMatch ? queryDateMatch[0] : null;
        const username = usernameMatch ? usernameMatch[1] : null;

        if (!queryDate || !username) {
            return NextResponse.json({ error: '파일 이름에 날짜 또는 Instagram ID가 없습니다.' }, { status: 400 });
        }

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
            }
        });

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

        // MongoDB 저장
        const client = await clientPromise;
        const db = client.db('userDatabase');
        const collection = db.collection('users');

        const result = await collection.updateOne(
            { email: session.user.email },
            {
                $push: {
                    history: {
                        queryDate: new Date(queryDate),
                        username,
                        unfollowList,
                    },
                },
            },
            { upsert: true }
        );

        console.log('MongoDB update result:', result);
        console.log('Saved data:', { queryDate, username, unfollowList });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in upload API:', error);
        return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
