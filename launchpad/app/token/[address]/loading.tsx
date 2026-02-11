export default function TokenLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-tokamak-blue border-t-transparent" />
      <p className="mt-3 text-sm text-gray-500">Loading token…</p>
    </div>
  );
}
