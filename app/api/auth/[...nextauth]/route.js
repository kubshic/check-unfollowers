import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from '@/lib/mongodb';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';

export const authOptions = {
    // OAuth Providers 설정
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    // MongoDB Adapter 설정 (유저 데이터 저장)
    adapter: MongoDBAdapter(clientPromise, {
        databaseName: 'userDatabase', // 사용할 데이터베이스 명시적으로 설정
    }),
    session: {
        strategy: 'jwt', // JWT 기반 세션 관리
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET, // 명시적으로 JWT 암호화에 사용할 키 설정
    },
    secret: process.env.NEXTAUTH_SECRET, // NextAuth 전역 비밀키 설정
    callbacks: {
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
