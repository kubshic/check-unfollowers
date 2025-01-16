'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const handleUpload = async (event) => {
        event.preventDefault();
        const file = event.target.file.files[0];

        if (!file) {
            setError('파일을 선택하세요.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsUploading(true);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setError(null);
                router.push('/result'); // 결과 페이지로 이동
            } else {
                const result = await response.json();
                setError(result.error);
            }
        } catch (err) {
            setError('업로드 중 에러가 발생했습니다.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <h1>압축된 JSON 파일 업로드</h1>
            <form onSubmit={handleUpload}>
                <input type="file" name="file" accept=".zip" />
                <button type="submit" disabled={isUploading}>
                    {isUploading ? '업로드 중...' : '업로드'}
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
