import { redirect } from 'next/navigation';

// Root redirect to login
export default function HomePage() {
    redirect('/login');
}
