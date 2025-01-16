'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [history, setHistory] = useState([]);
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
                    setHistory(data.history || []);
                } else {
                    setError(data.error || 'Failed to fetch history.');
                }
            } catch (err) {
                setError('An error occurred while fetching data.');
            }
        };

        fetchHistory();
    }, [status, session, router]);

    const toggleSection = (username) => {
        setOpenSections((prevState) => ({
            ...prevState,
            [username]: !prevState[username],
        }));
    };

    const toggleDate = (date) => {
        setOpenDates((prevState) => ({
            ...prevState,
            [date]: !prevState[date],
        }));
    };

    const groupedHistory = history.reduce((acc, record) => {
        const { username, queryDate, unfollowList } = record;
        if (!acc[username]) {
            acc[username] = [];
        }
        acc[username].push({ queryDate, unfollowList });
        return acc;
    }, {});

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
                <h2 className="text-2xl font-bold mb-4">My Unfollow History</h2>
                {error && <p className="text-red-500">{error}</p>}
                {Object.keys(groupedHistory).length > 0 ? (
                    <ul className="space-y-6">
                        {Object.entries(groupedHistory).map(([username, records]) => (
                            <li key={username}>
                                <button
                                    onClick={() => toggleSection(username)}
                                    className="text-blue-500 font-bold text-lg"
                                >
                                    {username}
                                </button>
                                {openSections[username] && (
                                    <ul className="space-y-4 mt-4">
                                        {records.map(({ queryDate, unfollowList }, index) => (
                                            <li key={index}>
                                                <button onClick={() => toggleDate(queryDate)} className="text-blue-500">
                                                    {new Date(queryDate).toLocaleDateString()}
                                                </button>
                                                {openDates[queryDate] && (
                                                    <ul className="list-disc pl-6 mt-2 space-y-1">
                                                        {unfollowList.map((user, i) => (
                                                            <li key={i}>{user}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
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
