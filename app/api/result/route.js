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

        const user = await collection.findOne(
            { email: session.user.email },
            { projection: { history: { $slice: -1 } } }
        );

        if (!user || !user.history || user.history.length === 0) {
            return NextResponse.json({ error: '조회 가능한 데이터가 없습니다.' }, { status: 404 });
        }

        const { username, queryDate, unfollowList } = user.history[0];

        return NextResponse.json({ username, queryDate, unfollowList });
    } catch (error) {
        console.error('Error in result API:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
