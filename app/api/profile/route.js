import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';

export async function GET(req) {
    const session = await getServerSession(req, authOptions);

    if (!session) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db('myDatabase'); // 데이터베이스 이름
        const collection = db.collection('users');

        // 현재 사용자 정보 가져오기
        const user = await collection.findOne({ email: session.user.email });

        if (!user) {
            return new Response(JSON.stringify({ error: '사용자를 찾을 수 없습니다.' }), { status: 404 });
        }

        // 언팔 리스트 반환
        return new Response(JSON.stringify({ unfollowList: user.unfollowList || [] }), { status: 200 });
    } catch (error) {
        console.error('Error fetching unfollow list:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch unfollow list' }), { status: 500 });
    }
}
