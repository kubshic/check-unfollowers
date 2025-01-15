'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSignInOut = async () => {
        if (session) {
            // 로그아웃 처리
            await signOut();
        } else {
            // 로그인 페이지로 이동
            router.push('/signin');
        }
    };

    return (
        <div>
            {/* Navigation Bar */}
            <nav className="bg-blue-500 text-white px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <Image
                        src="/logo.png" // 로고 이미지 경로를 업데이트하세요
                        alt="Logo"
                        width={40}
                        height={40}
                    />
                    <span className="text-lg font-bold">My Website</span>
                </div>

                {/* Desktop Menu */}
                <ul className="hidden md:flex space-x-6">
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/about')}>
                        About
                    </li>
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/upload')}>
                        Start
                    </li>
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/faq')}>
                        FAQ
                    </li>
                    {session && (
                        <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/profile')}>
                            My Page
                        </li>
                    )}
                    <li className="hover:text-gray-200 cursor-pointer" onClick={handleSignInOut}>
                        {session ? 'Sign Out' : 'Sign In'}
                    </li>
                </ul>

                {/* Hamburger Menu (Mobile) */}
                <button className="md:hidden text-2xl focus:outline-none" onClick={toggleMenu}>
                    ☰
                </button>
            </nav>

            {/* Mobile Menu */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'max-h-screen' : 'max-h-0'
                }`}
            >
                <ul className="bg-blue-500 text-white px-4 py-2 space-y-2">
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/about')}>
                        About
                    </li>
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/upload')}>
                        Start
                    </li>
                    <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/faq')}>
                        FAQ
                    </li>
                    {session && (
                        <li className="hover:text-gray-200 cursor-pointer" onClick={() => router.push('/profile')}>
                            My Page
                        </li>
                    )}
                    <li className="hover:text-gray-200 cursor-pointer" onClick={handleSignInOut}>
                        {session ? 'Sign Out' : 'Sign In'}
                    </li>
                </ul>
            </div>

            {/* Main Content */}
            <main className="p-6">
                <h1 className="text-3xl font-bold mb-4">Welcome to My Website</h1>
                <p className="text-gray-700">
                    This is a responsive website with a navigation bar that adapts to different screen sizes.
                </p>
            </main>
        </div>
    );
}
