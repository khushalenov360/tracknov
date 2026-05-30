export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-enter flex flex-col min-h-screen">
      {children}
    </div>
  );
}
