import { ReactNode } from 'react';

interface PageProps {
  children: ReactNode;
}

const Page = ({ children }: PageProps) => {
  return (
    <main className="container mx-auto px-4 py-8">
      {children}
    </main>
  );
};

export default Page;
