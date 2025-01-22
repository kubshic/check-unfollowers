'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [instagramHistory, setInstagramHistory] = useState([]);
    const [threadsHistory, setThreadsHistory] = useState([]);
    const [error, setError] = useState(null);
    const [openSections, setOpenSections] = useState({});
    const [openDates, setOpenDates] = useState({});

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/signin');
            return;
        }

        const fetchHistory = async () => {
            try {
                const response = await fetch('/api/profile');
                const data = await response.json();
                if (response.ok) {
                    setInstagramHistory(data.instagramHistory || []);
                    setThreadsHistory(data.threadsHistory || []);
                } else {
                    setError(data.error || 'Failed to fetch history.');
                }
            } catch (err) {
                setError('An error occurred while fetching data.');
            }
        };

        fetchHistory();
    }, [status, session, router]);

    const toggleSection = (key) => {
        setOpenSections((prevState) => ({
            ...prevState,
            [key]: !prevState[key],
        }));
    };

    const toggleDate = (date) => {
        setOpenDates((prevState) => ({
            ...prevState,
            [date]: !prevState[date],
        }));
    };

    const groupedHistory = {};
    // Instagram 데이터 추가
    instagramHistory.forEach((record) => {
        if (!groupedHistory[record.username]) {
            groupedHistory[record.username] = { instagram: [], threads: [] };
        }
        groupedHistory[record.username].instagram.push(record);
    });

    // Threads 데이터 추가
    threadsHistory.forEach((record) => {
        if (!groupedHistory[record.username]) {
            groupedHistory[record.username] = { instagram: [], threads: [] };
        }
        groupedHistory[record.username].threads.push(record);
    });

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <section className="mb-8 bg-white shadow-md rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-4">My Information</h1>
                <p>
                    <strong>Name:</strong> {session?.user?.name || 'Unknown'}
                </p>
                <p>
                    <strong>Email:</strong> {session?.user?.email || 'Unknown'}
                </p>
            </section>

            <section className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">My History</h2>
                {error && <p className="text-red-500">{error}</p>}
                {Object.keys(groupedHistory).length > 0 ? (
                    <ul className="space-y-6">
                        {Object.entries(groupedHistory).map(([username, { instagram, threads }]) => (
                            <li key={username}>
                                {instagram.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => toggleSection(`${username}-instagram`)}
                                            className="flex items-center text-blue-500 font-bold text-lg"
                                        >
                                            {username}
                                            <img
                                                src="/instagram-icon.svg"
                                                alt="Instagram Icon"
                                                className="w-5 h-5 ml-2"
                                            />
                                        </button>
                                        {openSections[`${username}-instagram`] && (
                                            <ul className="space-y-4 mt-4">
                                                {instagram.map((record, index) => (
                                                    <li key={index}>
                                                        <button
                                                            onClick={() => toggleDate(record.queryDate)}
                                                            className="text-blue-500"
                                                        >
                                                            {new Date(record.queryDate).toLocaleDateString()}
                                                        </button>
                                                        {openDates[record.queryDate] && (
                                                            <div className="flex space-x-4 mt-4">
                                                                <div className="w-1/2">
                                                                    <h3 className="font-bold">Unfollow List</h3>
                                                                    {record.unfollowList.length > 0 ? (
                                                                        <ul className="list-disc pl-6 space-y-1">
                                                                            {record.unfollowList.map((user, i) => (
                                                                                <li key={i}>{user}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p>Unfollow List가 없습니다.</p>
                                                                    )}
                                                                </div>
                                                                <div className="w-1/2">
                                                                    <h3 className="font-bold">New Unfollowers</h3>
                                                                    {record.newUnfollowers.length > 0 ? (
                                                                        <ul className="list-disc pl-6 space-y-1">
                                                                            {record.newUnfollowers.map((user, i) => (
                                                                                <li key={i}>{user}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p>새로운 Unfollowers가 없습니다.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {threads.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => toggleSection(`${username}-threads`)}
                                            className="flex items-center text-blue-500 font-bold text-lg"
                                        >
                                            {username}
                                            <img src="/threads-icon.svg" alt="Threads Icon" className="w-5 h-5 ml-2" />
                                        </button>
                                        {openSections[`${username}-threads`] && (
                                            <ul className="space-y-4 mt-4">
                                                {threads.map((record, index) => (
                                                    <li key={index}>
                                                        <button
                                                            onClick={() => toggleDate(record.queryDate)}
                                                            className="text-blue-500"
                                                        >
                                                            {new Date(record.queryDate).toLocaleDateString()}
                                                        </button>
                                                        {openDates[record.queryDate] && (
                                                            <div className="flex space-x-4 mt-4">
                                                                <div className="w-1/2">
                                                                    <h3 className="font-bold">Unfollow List</h3>
                                                                    {record.unfollowList.length > 0 ? (
                                                                        <ul className="list-disc pl-6 space-y-1">
                                                                            {record.unfollowList.map((user, i) => (
                                                                                <li key={i}>{user}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p>Unfollow List가 없습니다.</p>
                                                                    )}
                                                                </div>
                                                                <div className="w-1/2">
                                                                    <h3 className="font-bold">New Unfollowers</h3>
                                                                    {record.newUnfollowers.length > 0 ? (
                                                                        <ul className="list-disc pl-6 space-y-1">
                                                                            {record.newUnfollowers.map((user, i) => (
                                                                                <li key={i}>{user}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p>새로운 Unfollowers가 없습니다.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">아직 조회된 히스토리가 없습니다.</p>
                )}
            </section>
        </div>
    );
}
