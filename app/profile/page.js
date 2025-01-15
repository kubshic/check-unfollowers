'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [unfollowList, setUnfollowList] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === 'loading') return; // 세션 로딩 중
        if (!session) {
            router.push('/signin'); // 로그인되지 않은 경우 로그인 페이지로 리디렉션
            return;
        }

        // 언팔 리스트 가져오기
        const fetchUnfollowList = async () => {
            try {
                const response = await fetch('/api/profile/unfollow-list');
                const data = await response.json();

                if (response.ok) {
                    setUnfollowList(data.unfollowList);
                } else {
                    setError(data.error || '데이터를 가져오는 중 문제가 발생했습니다.');
                }
            } catch (err) {
                setError('서버와의 통신 중 문제가 발생했습니다.');
                console.error(err);
            }
        };

        fetchUnfollowList();
    }, [session, status, router]);

    if (status === 'loading') {
        return <p>로딩 중...</p>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* 사용자 정보 섹션 */}
            <section className="mb-8 bg-white shadow-md rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-4">My Information</h1>
                <p>
                    <strong>Name:</strong> {session?.user?.name || 'Unknown'}
                </p>
                <p>
                    <strong>Email:</strong> {session?.user?.email || 'Unknown'}
                </p>
            </section>

            {/* 언팔 리스트 섹션 */}
            <section className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">My Unfollow List</h2>
                {error && <p className="text-red-500">{error}</p>}
                {unfollowList.length > 0 ? (
                    <ul className="list-disc pl-6 space-y-2">
                        {unfollowList.map((user, index) => (
                            <li key={index}>{user}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">아직 조회된 언팔 리스트가 없습니다.</p>
                )}
            </section>
        </div>
    );
}
