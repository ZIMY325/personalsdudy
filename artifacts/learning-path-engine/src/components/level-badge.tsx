import type { CourseLevel } from '@/lib/course-level';
import { useLanguage } from '@/components/language-provider';

const colors: Record<CourseLevel, string> = {
  Beginner: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Intermediate: 'border-blue-300 bg-blue-50 text-blue-800',
  Advanced: 'border-purple-300 bg-purple-50 text-purple-800',
};

export function LevelBadge({ level }: { level: CourseLevel }) {
  const { t } = useLanguage();
  return (
    <span data-level={level} className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${colors[level]}`}>
      {t(level)}
    </span>
  );
}
