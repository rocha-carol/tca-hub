import { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export default function PageContainer({ children, sidebar, className = "" }: PageContainerProps) {
  if (sidebar) {
    return (
      <div className="flex min-h-[calc(100vh-56px)]">
        {sidebar}
        <main className={`flex-1 overflow-y-auto bg-transparent px-6 py-8 ${className}`}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <main className={`max-w-5xl mx-auto px-6 py-8 ${className}`}>
      {children}
    </main>
  );
}
