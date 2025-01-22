import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const client = await clientPromise;
        const db = client.db('userDatabase');
        const collection = db.collection('users');

        const userData = await collection.findOne(
            { email: session.user.email },
            { projection: { instagramHistory: 1, threadsHistory: 1 } }
        );

        if (!userData) {
            return new Response(JSON.stringify({ instagramHistory: [], threadsHistory: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const instagramHistory = userData.instagramHistory || [];
        const threadsHistory = userData.threadsHistory || [];

        return new Response(JSON.stringify({ instagramHistory, threadsHistory }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
