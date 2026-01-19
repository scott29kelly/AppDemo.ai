import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <main className="flex flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          AppDemo<span className="text-blue-600">.ai</span>
        </h1>
        <p className="mb-8 max-w-2xl text-xl text-gray-600">
          Transform any web application URL into a polished, narrated product demo video in
          minutes.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
