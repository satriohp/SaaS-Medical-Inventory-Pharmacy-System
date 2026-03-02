import React from 'react';

// Auth group layout — minimal, just passes children through
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
