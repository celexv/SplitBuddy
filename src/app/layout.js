import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'SplitBuddy — Split Expenses, Stay Friends',
  description:
    'Easily split group expenses with friends and family. Track who paid what, split equally or unequally, and see instant settlement suggestions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
