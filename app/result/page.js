'use client';

import { useEffect, useState } from 'react';

export default function ResultPage() {
    const [unfollowList, setUnfollowList] = useState([]);
    const [username, setUsername] = useState('');
    const [queryDate, setQueryDate] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const response = await fetch('/api/result'); // 최신 데이터 조회
                const result = await response.json();

                if (response.ok) {
                    setUnfollowList(result.unfollowList);
                    setUsername(result.username);
                    setQueryDate(result.queryDate);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError('데이터를 처리하는 중 오류가 발생했습니다.');
                console.error(err);
            }
        };

        fetchResult();
    }, []);

    return (
        <div>
            <h1>결과 페이지</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {unfollowList.length > 0 ? (
                <div>
                    <p>
                        <strong>Instagram ID:</strong> {username}
                    </p>
                    <p>
                        <strong>조회 날짜:</strong> {new Date(queryDate).toLocaleDateString()}
                    </p>
                    <ul>
                        {unfollowList.map((user, index) => (
                            <li key={index}>{user}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>데이터를 불러오는 중...</p>
            )}
        </div>
    );
}
