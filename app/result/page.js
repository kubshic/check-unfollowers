'use client';

import { useEffect, useState } from 'react';

export default function ResultPage() {
    const [instagramData, setInstagramData] = useState(null);
    const [threadsData, setThreadsData] = useState(null);
    const [username, setUsername] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const response = await fetch('/api/result'); // 최신 데이터 조회
                const result = await response.json();

                if (response.ok) {
                    setInstagramData(result.instagram);
                    setThreadsData(result.threads);

                    // Instagram ID를 통일하여 사용
                    if (result.instagram) {
                        setUsername(result.instagram.username);
                    } else if (result.threads) {
                        setUsername(result.threads.username);
                    }
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
            {username && (
                <p>
                    <strong>Instagram ID:</strong> {username}
                </p>
            )}

            {instagramData && (
                <section>
                    <h2>Instagram 결과</h2>
                    <p>
                        <strong>조회 날짜:</strong> {new Date(instagramData.queryDate).toLocaleDateString()}
                    </p>
                    <h3>Unfollow List:</h3>
                    {instagramData.unfollowList.length > 0 ? (
                        <ul>
                            {instagramData.unfollowList.map((user, index) => (
                                <li key={index}>{user}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Unfollow List가 없습니다.</p>
                    )}
                    <h3>New Unfollowers:</h3>
                    {instagramData.newUnfollowers.length > 0 ? (
                        <ul>
                            {instagramData.newUnfollowers.map((user, index) => (
                                <li key={index}>{user}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>새로운 Unfollowers가 없습니다.</p>
                    )}
                </section>
            )}

            {threadsData && (
                <section>
                    <h2>Threads 결과</h2>
                    <p>
                        <strong>조회 날짜:</strong> {new Date(threadsData.queryDate).toLocaleDateString()}
                    </p>
                    <h3>Unfollow List:</h3>
                    {threadsData.unfollowList.length > 0 ? (
                        <ul>
                            {threadsData.unfollowList.map((user, index) => (
                                <li key={index}>{user}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Unfollow List가 없습니다.</p>
                    )}
                    <h3>New Unfollowers:</h3>
                    {threadsData.newUnfollowers.length > 0 ? (
                        <ul>
                            {threadsData.newUnfollowers.map((user, index) => (
                                <li key={index}>{user}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>새로운 Unfollowers가 없습니다.</p>
                    )}
                </section>
            )}

            {!instagramData && !threadsData && !error && <p>데이터를 불러오는 중...</p>}
        </div>
    );
}
