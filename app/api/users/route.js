import clientPromise from '@/lib/mongodb';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db('userDatabase');
        const users = await db.collection('users').find({}).toArray();

        return new Response(JSON.stringify(users), { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500 });
    }
}
