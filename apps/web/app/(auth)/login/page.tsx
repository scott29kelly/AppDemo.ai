export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        {/* TODO: Implement auth form in Phase 4 */}
        <p className="text-center text-sm text-gray-500">
          Authentication will be implemented in Phase 4
        </p>
      </div>
    </div>
  );
}
