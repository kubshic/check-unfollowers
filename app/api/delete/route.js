'use client';

import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const email = session.user.email;
        if (!email.endsWith('@korea.ac.kr')) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const { date, historyType } = body;

        if (!date || !historyType || !['instagramHistory', 'threadsHistory'].includes(historyType)) {
            return new Response(JSON.stringify({ error: 'Invalid input' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const client = await clientPromise;
        const db = client.db('userDatabase');
        const collection = db.collection('users');

        const updateResult = await collection.updateOne({ email }, { $pull: { [historyType]: { queryDate: date } } });

        if (updateResult.modifiedCount === 0) {
            return new Response(JSON.stringify({ error: 'No records deleted' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting record:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
