export default function ProjectsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Projects</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
          New Project
        </button>
      </div>
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-gray-600">No projects yet. Create your first demo!</p>
      </div>
    </div>
  );
}
