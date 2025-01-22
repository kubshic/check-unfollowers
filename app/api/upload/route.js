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

        // 압축 파일 내 모든 경로 추출
        const entries = zip.getEntries().map((entry) => entry.entryName);

        // Instagram과 Threads 폴더 확인
        const instagramExists = entries.includes('connections/');
        const threadsExists = entries.includes('your_instagram_activity/');

        if (!instagramExists && !threadsExists) {
            return NextResponse.json({ error: '유효한 폴더가 없습니다.' }, { status: 400 });
        }

        const instagramHistory = [];
        const threadsHistory = [];
        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });

        // 유틸리티 함수: JSON 데이터에서 value 값 추출
        const extractValues = (data) => {
            const values = [];
            const traverse = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(traverse);
                } else if (obj && typeof obj === 'object') {
                    if (obj.string_list_data) {
                        obj.string_list_data.forEach((item) => {
                            if (item.value) {
                                values.push(item.value);
                            }
                        });
                    }
                    Object.values(obj).forEach(traverse);
                }
            };
            traverse(data);
            return values;
        };

        const getPreviousUnfollowList = async (collectionName, currentQueryDate) => {
            const client = await clientPromise;
            const db = client.db('userDatabase');
            const collection = db.collection('users');

            const user = await collection.findOne({ email: session.user.email });

            if (user && Array.isArray(user[collectionName])) {
                const filteredHistory = user[collectionName]
                    .filter((item) => item.queryDate !== currentQueryDate)
                    .sort((a, b) => new Date(b.queryDate) - new Date(a.queryDate)); // 최신 순으로 정렬.

                return filteredHistory.length > 0 ? filteredHistory[0].unfollowList || [] : [];
            }

            return [];
        };

        const calculateNewUnfollowers = (previousList, currentList) => {
            const previousSet = new Set(previousList);
            return currentList.filter((user) => !previousSet.has(user));
        };

        // Instagram 처리
        if (instagramExists) {
            const targetFiles = [
                'connections/followers_and_following/followers_1.json',
                'connections/followers_and_following/following.json',
            ];

            const followersPath = path.join(tempDir, 'followers_1.json');
            const followingPath = path.join(tempDir, 'following.json');

            targetFiles.forEach((targetPath) => {
                const entry = zip.getEntry(targetPath);
                if (entry) {
                    const content = zip.readAsText(entry);
                    const outputPath = path.join(tempDir, path.basename(targetPath));
                    fs.writeFileSync(outputPath, content);
                }
            });

            if (fs.existsSync(followersPath) && fs.existsSync(followingPath)) {
                const followersData = JSON.parse(fs.readFileSync(followersPath, 'utf-8'));
                const followingData = JSON.parse(fs.readFileSync(followingPath, 'utf-8'));

                const followersValues = new Set(extractValues(followersData));
                const followingValues = extractValues(followingData);

                const unfollowList = followingValues.filter((user) => !followersValues.has(user));
                const previousUnfollowList = await getPreviousUnfollowList('Instagram', queryDate);
                const newUnfollowers = calculateNewUnfollowers(previousUnfollowList, unfollowList);

                instagramHistory.push({
                    queryDate: new Date(queryDate),
                    username,
                    unfollowList,
                    newUnfollowers,
                });
            }
        }

        // Threads 처리
        if (threadsExists) {
            const targetFiles = [
                'your_instagram_activity/threads/followers.json',
                'your_instagram_activity/threads/following.json',
            ];

            const followersPath = path.join(tempDir, 'followers.json');
            const followingPath = path.join(tempDir, 'following.json');

            targetFiles.forEach((targetPath) => {
                const entry = zip.getEntry(targetPath);
                if (entry) {
                    const content = zip.readAsText(entry);
                    const outputPath = path.join(tempDir, path.basename(targetPath));
                    fs.writeFileSync(outputPath, content);
                }
            });

            if (fs.existsSync(followersPath) && fs.existsSync(followingPath)) {
                const followersData = JSON.parse(fs.readFileSync(followersPath, 'utf-8'));
                const followingData = JSON.parse(fs.readFileSync(followingPath, 'utf-8'));

                const followersValues = new Set(extractValues(followersData));
                const followingValues = extractValues(followingData);

                const unfollowList = followingValues.filter((user) => !followersValues.has(user));
                const previousUnfollowList = await getPreviousUnfollowList('Threads', queryDate);
                const newUnfollowers = calculateNewUnfollowers(previousUnfollowList, unfollowList);

                threadsHistory.push({
                    queryDate: new Date(queryDate),
                    username,
                    unfollowList,
                    newUnfollowers,
                });
            }
        }

        // MongoDB 저장
        const client = await clientPromise;
        const db = client.db('userDatabase');
        const collection = db.collection('users');

        const updateData = {};
        if (instagramHistory.length > 0) {
            updateData.instagramHistory = { $each: instagramHistory };
        }
        if (threadsHistory.length > 0) {
            updateData.threadsHistory = { $each: threadsHistory };
        }

        const result = await collection.updateOne(
            { email: session.user.email },
            {
                $push: updateData,
            },
            { upsert: true }
        );

        console.log('MongoDB update result:', result);
        console.log('Saved data:', { instagramHistory, threadsHistory });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in upload API:', error);
        return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
