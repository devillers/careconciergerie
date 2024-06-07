import './globals.css';

export const metadata = {
  title: 'care concierge app',
  description: 'david devillers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
