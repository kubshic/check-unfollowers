'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                const data = await response.json();

                if (response.ok) {
                    setUsers(data);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError('유저 데이터를 가져오는 중 에러가 발생했습니다.');
                console.error(err);
            }
        };

        fetchUsers();
    }, []);

    return (
        <div>
            <h1>유저 목록</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {users.length > 0 ? (
                <ul>
                    {users.map((user) => (
                        <li key={user._id}>
                            {user.name} ({user.email})
                        </li>
                    ))}
                </ul>
            ) : (
                <p>유저가 없습니다.</p>
            )}
        </div>
    );
}
