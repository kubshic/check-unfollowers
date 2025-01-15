'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SigninPage() {
    const { data: session } = useSession();
    const [error, setError] = useState(null);
    const router = useRouter();

    // 로그인 성공 시 홈 페이지로 이동
    if (session) {
        router.push('/');
    }

    const handleGoogleSignIn = async () => {
        try {
            await signIn('google'); // Google 로그인
        } catch (err) {
            console.error('Google 로그인 중 오류 발생:', err);
            setError('Google 로그인에 실패했습니다.');
        }
    };

    return (
        <div>
            <h1>로그인</h1>
            <button onClick={handleGoogleSignIn}>Google로 로그인</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
