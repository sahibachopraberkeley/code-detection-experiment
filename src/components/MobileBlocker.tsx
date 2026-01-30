import { useEffect, useState } from 'react';

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <svg
            className="w-16 h-16 mx-auto mb-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h1 className="text-2xl font-bold mb-4">Desktop Required</h1>
          <p className="text-gray-300">
            Please use a desktop or laptop computer to complete this study. Mobile devices are not
            supported.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
