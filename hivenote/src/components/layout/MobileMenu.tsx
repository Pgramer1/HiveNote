"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  isLoggedIn: boolean;
};

export default function MobileMenu({ isLoggedIn }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 dark:text-white"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="flex flex-col p-4 space-y-3">
            <Link
              href="/resources"
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition dark:text-white"
              onClick={() => setIsOpen(false)}
            >
              Resources
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/resources/upload"
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition dark:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Upload
                </Link>
                <Link
                  href="/me"
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition dark:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  My Profile
                </Link>
                <form action="/api/auth/signout" method="post">
                  <button className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <form action="/api/auth/signin" method="post">
                <button className="w-full text-left px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                  Login
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
