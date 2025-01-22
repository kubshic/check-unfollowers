'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();

    const handleLogoClick = () => {
        window.location.href = '/';
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSignInOut = async () => {
        if (session) {
            await signOut();
        } else {
            // Google 로그인 페이지로 이동
            await signIn('google');
        }
    };

    return (
        <>
            <nav className="bg-white border-b-4 text-black px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center space-x-4 cursor-pointer" onClick={handleLogoClick}>
                    <Image src="/logo.svg" alt="Logo" width={40} height={40} />
                    <span className="text-xl font-bold pt-1">FollowCheck</span>
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
                <ul className="bg-white text-black border-b-4 px-4 py-2 space-y-2">
                    <li
                        className="hover:text-[#FE06AE] cursor-pointer"
                        onClick={() => {
                            setIsMenuOpen(false);
                            router.push('/about');
                        }}
                    >
                        About
                    </li>
                    <li
                        className="hover:text-[#FE06AE] cursor-pointer"
                        onClick={() => {
                            setIsMenuOpen(false);
                            router.push('/upload');
                        }}
                    >
                        Start
                    </li>
                    <li
                        className="hover:text-[#FE06AE] cursor-pointer"
                        onClick={() => {
                            setIsMenuOpen(false);
                            router.push('/faq');
                        }}
                    >
                        FAQ
                    </li>
                    {session && (
                        <li
                            className="hover:text-[#FE06AE] cursor-pointer"
                            onClick={() => {
                                setIsMenuOpen(false);
                                router.push('/profile');
                            }}
                        >
                            My Page
                        </li>
                    )}

                    <li className="hover:text-[#FE06AE] cursor-pointer" onClick={handleSignInOut}>
                        {session ? 'Sign Out' : 'Sign In'}
                    </li>
                </ul>
            </div>
        </>
    );
}
