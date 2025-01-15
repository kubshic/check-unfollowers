import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
    const session = await getServerSession(req, authOptions);

    if (!session) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    try {
        const { unfollowList } = await req.json();

        const client = await clientPromise;
        const db = client.db('myDatabase'); // 데이터베이스 이름
        const collection = db.collection('users');

        // 현재 날짜와 시각
        const queryDate = new Date();

        // 사용자 문서에 언팔 리스트 추가
        const result = await collection.updateOne(
            { email: session.user.email },
            {
                $push: {
                    history: {
                        queryDate,
                        unfollowList,
                    },
                },
            },
            { upsert: true } // 사용자 문서가 없으면 새로 생성
        );

        return new Response(JSON.stringify({ message: 'Unfollow list saved successfully' }), { status: 201 });
    } catch (error) {
        console.error('Error saving query:', error);
        return new Response(JSON.stringify({ error: 'Failed to save query' }), { status: 500 });
    }
}
