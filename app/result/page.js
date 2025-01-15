'use client';

import { useEffect, useState } from 'react';

export default function ResultsPage() {
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAndSaveData = async () => {
            try {
                // JSON 파일 분석 및 언팔 리스트 계산
                const response = await fetch('/api/results');
                const result = await response.json();

                if (response.ok) {
                    setError(null);

                    // MongoDB에 저장
                    await saveToHistory(result.followersData, result.followingData);

                    // 저장된 history 데이터 가져오기
                    const historyResponse = await fetch('/api/profile/history');
                    const historyResult = await historyResponse.json();

                    if (historyResponse.ok) {
                        setHistory(historyResult.history || []);
                    } else {
                        setError(historyResult.error);
                    }
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError('데이터를 처리하는 중 에러가 발생했습니다.');
                console.error(err);
            }
        };

        const saveToHistory = async (followersData, followingData) => {
            try {
                const response = await fetch('/api/save-query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ followersData, followingData }),
                });

                if (!response.ok) {
                    console.error('Failed to save query:', await response.json());
                }
            } catch (err) {
                console.error('Error saving to history:', err.message);
            }
        };

        fetchAndSaveData();
    }, []);

    const [expandedDate, setExpandedDate] = useState(null);

    const toggleDate = (date) => {
        setExpandedDate(expandedDate === date ? null : date);
    };

    return (
        <div>
            <h1>결과 페이지</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {history.length > 0 ? (
                <ul>
                    {history.map((entry, index) => (
                        <li key={index}>
                            <button
                                onClick={() => toggleDate(entry.queryDate)}
                                className="text-blue-500 hover:underline"
                            >
                                {new Date(entry.queryDate).toLocaleString()}
                            </button>
                            {expandedDate === entry.queryDate && (
                                <div className="pl-4">
                                    <h3>Followers:</h3>
                                    <ul className="list-disc pl-6">
                                        {entry.followers.map((user, idx) => (
                                            <li key={idx}>{user}</li>
                                        ))}
                                    </ul>
                                    <h3>Following:</h3>
                                    <ul className="list-disc pl-6">
                                        {entry.following.map((user, idx) => (
                                            <li key={idx}>{user}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>데이터를 불러오는 중...</p>
            )}
        </div>
    );
}
