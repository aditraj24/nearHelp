import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  text?: string;
}

const PageLoader = ({ text = "Loading..." }: PageLoaderProps) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-25"></div>
        <div className="bg-white p-4 rounded-full shadow-xl border border-red-100 relative z-10">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      </div>
      <h3 className="mt-6 text-lg font-medium text-gray-800 tracking-wide animate-pulse">{text}</h3>
    </div>
  );
};

export default PageLoader;
