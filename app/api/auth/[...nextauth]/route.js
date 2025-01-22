import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from '@/lib/mongodb';

export const authOptions = {
    // OAuth Providers 설정
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    session: {
        strategy: 'jwt', // JWT 기반 세션 관리
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET, // 명시적으로 JWT 암호화에 사용할 키 설정
    },
    callbacks: {
        async signIn({ user }) {
            // MongoDB를 통해 사용자 데이터를 확인하거나 저장
            const client = await clientPromise;
            const db = client.db('userDatabase');
            const usersCollection = db.collection('users');

            // 스키마에 따라 사용자 정보 구성
            const userDocument = {
                name: user.name || null,
                email: user.email,
                image: user.image || null,
                instagramHistory: [], // 기본값 빈 배열
                threadsHistory: [], // 기본값 빈 배열
            };

            // 이메일로 기존 사용자 검색
            const existingUser = await usersCollection.findOne({ email: user.email });

            if (!existingUser) {
                // 신규 사용자 추가
                await usersCollection.insertOne(userDocument);
            } else {
                // 이미 존재하는 사용자의 데이터 업데이트 (필요 시)
                await usersCollection.updateOne(
                    { email: user.email },
                    { $set: { name: user.name, image: user.image } }
                );
            }

            return true; // 로그인 성공
        },
        async session({ session, token }) {
            // 세션에 사용자 ID 추가
            session.user.id = token.id;
            return session;
        },
        async jwt({ token, user }) {
            // JWT 토큰에 사용자 ID 추가
            if (user) {
                token.id = user.id;
            }
            return token;
        },
    },
    pages: {
        signIn: '/signin', // 커스텀 로그인 페이지 설정
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
