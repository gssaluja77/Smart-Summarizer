export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-start justify-center">
      <div className="w-6 h-6 border-3 border-dashed rounded-full animate-spin border-white"></div>
    </div>
  );
}
