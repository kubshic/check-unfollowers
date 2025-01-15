import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!userName || !password) {
            return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
        }

        // MongoDB 연결
        const client = await clientPromise;
        const db = client.db('myDatabase'); // 데이터베이스 이름
        const collection = db.collection('users'); // 컬렉션 이름

        // 사용자 찾기
        const user = await collection.findOne({ email });
        if (!user) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
        }

        // 로그인 성공
        return NextResponse.json({ message: '로그인 성공', user: { username: user.username, email: user.email } });
    } catch (error) {
        console.error('Error during signin:', error);
        return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
