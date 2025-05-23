import { ReactNode } from 'react';

export default function AuthTestLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-background">{children}</div>
      </body>
    </html>
  );
}
