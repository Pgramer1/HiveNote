import { requireAdmin } from "@/lib/permissions";
import { getDepartments } from "@/actions/admin-departments";
import { getBatches } from "@/actions/admin-batches";
import { getSubjectsAdmin } from "@/actions/admin-subjects";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Plus, Settings, GraduationCap, Calendar, BookOpen, Users } from "lucide-react";

export default async function AdminDashboard() {
  await requireAdmin();

  const [departments, batches, subjects] = await Promise.all([
    getDepartments(),
    getBatches(),
    getSubjectsAdmin(),
  ]);

  const activeStats = {
    departments: departments.filter((d: any) => d.isActive).length,
    batches: batches.filter((b: any) => b.isActive).length,
    subjects: subjects.filter((s: any) => s.isActive).length,
    totalDepartments: departments.length,
    totalBatches: batches.length,
    totalSubjects: subjects.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage departments, batches, semesters, and subjects
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<GraduationCap className="w-6 h-6" />}
            title="Departments"
            active={activeStats.departments}
            total={activeStats.totalDepartments}
            color="blue"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            title="Batches"
            active={activeStats.batches}
            total={activeStats.totalBatches}
            color="indigo"
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            title="Subjects"
            active={activeStats.subjects}
            total={activeStats.totalSubjects}
            color="purple"
          />
        </div>

        {/* Management Sections */}
        <div className="space-y-8">
          {/* Departments */}
          <ManagementSection
            title="Departments"
            icon={<GraduationCap className="w-5 h-5" />}
            addLink="/admin/departments/new"
            items={departments}
            renderItem={(dept: any) => (
              <DepartmentCard key={dept.id} department={dept} />
            )}
          />

          {/* Batches */}
          <ManagementSection
            title="Batches"
            icon={<Calendar className="w-5 h-5" />}
            addLink="/admin/batches/new"
            items={batches}
            renderItem={(batch: any) => (
              <BatchCard key={batch.id} batch={batch} />
            )}
          />

          {/* Subjects */}
          <ManagementSection
            title="Subjects"
            icon={<BookOpen className="w-5 h-5" />}
            addLink="/admin/subjects/new"
            items={subjects}
            renderItem={(subject: any) => (
              <SubjectCard key={subject.id} subject={subject} />
            )}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, active, total, color }: any) {
  const colorMap: any = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorMap[color]} text-white mb-3`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {title}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {active}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              / {total} total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagementSection({ title, icon, addLink, items, renderItem }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-slate-700 dark:text-slate-300">
              {icon}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {items.length}
            </span>
          </div>
          <Link href={addLink}>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add {title.slice(0, -1)}
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="text-lg mb-2">No {title.toLowerCase()} yet</p>
            <p className="text-sm">Click the button above to create your first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
}

function DepartmentCard({ department }: any) {
  return (
    <Link
      href={`/admin/departments/${department.id}`}
      className="block p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg bg-slate-50 dark:bg-slate-800/50"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
            {department.code}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {department.name}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          department.isActive
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {department.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
      {department.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {department.description}
        </p>
      )}
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>{department._count?.batches || 0} batches</span>
        <span>{department._count?.subjects || 0} subjects</span>
      </div>
    </Link>
  );
}

function BatchCard({ batch }: any) {
  return (
    <Link
      href={`/admin/batches/${batch.id}`}
      className="block p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-lg bg-slate-50 dark:bg-slate-800/50"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
            Batch {batch.code}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {batch.years}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          batch.isActive
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {batch.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {batch.department?.name || 'Unknown Department'}
      </div>
    </Link>
  );
}

function SubjectCard({ subject }: any) {
  return (
    <Link
      href={`/admin/subjects/${subject.id}`}
      className="block p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg bg-slate-50 dark:bg-slate-800/50"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
            {subject.code}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
            {subject.name}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          subject.isActive
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {subject.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Sem {subject.semester}</span>
        <span>{subject._count?.resources || 0} resources</span>
      </div>
    </Link>
  );
}
