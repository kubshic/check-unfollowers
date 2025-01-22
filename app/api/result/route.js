import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db('userDatabase');
        const collection = db.collection('users');

        // 사용자 데이터를 조회합니다.
        const user = await collection.findOne(
            { email: session.user.email },
            { projection: { instagramHistory: 1, threadsHistory: 1 } }
        );

        if (!user) {
            return NextResponse.json({ error: '조회 가능한 데이터가 없습니다.' }, { status: 404 });
        }

        // Instagram과 Threads 기록의 최신 데이터를 가져옵니다.
        const latestInstagramHistory = user.instagramHistory?.slice(-1)[0] || null;
        const latestThreadsHistory = user.threadsHistory?.slice(-1)[0] || null;

        const response = {
            instagram: latestInstagramHistory
                ? {
                      username: latestInstagramHistory.username,
                      queryDate: latestInstagramHistory.queryDate,
                      unfollowList: latestInstagramHistory.unfollowList,
                      newUnfollowers: latestInstagramHistory.newUnfollowers,
                  }
                : null,
            threads: latestThreadsHistory
                ? {
                      username: latestThreadsHistory.username,
                      queryDate: latestThreadsHistory.queryDate,
                      unfollowList: latestThreadsHistory.unfollowList,
                      newUnfollowers: latestThreadsHistory.newUnfollowers,
                  }
                : null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in result API:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
