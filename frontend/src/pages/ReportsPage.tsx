import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, List } from 'lucide-react'
import { format, isSameDay, parseISO } from 'date-fns'
import type { Task } from '@/db/types'
import { CompletedTasksTable } from '@/components/reports/CompletedTasksTable'
import { DayGroupedList } from '@/components/reports/DayGroupedList'
import { MonthPicker } from '@/components/reports/MonthPicker'
import { ReportsCalendar } from '@/components/reports/ReportsCalendar'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useCompletedTasksByMonth, useTasks } from '@/hooks/useTasks'
import { exportTasksToExcel } from '@/utils/excelExport'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ViewMode = 'list' | 'calendar'

export function ReportsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [view, setView] = useState<ViewMode>('list')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { tasks, isLoading } = useCompletedTasksByMonth(year, month)
  const { updateTask, deleteTask } = useTasks('completed')

  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)

  useEffect(() => {
    setSelectedDate(null)
  }, [year, month])

  const dayTasks = useMemo(() => {
    if (!selectedDate) return []
    return tasks.filter(
      (task) => task.completedAt && isSameDay(parseISO(task.completedAt), selectedDate),
    )
  }, [tasks, selectedDate])

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Отчёты</h1>
          <p className="text-sm text-muted-foreground">Завершённые задачи за месяц</p>
        </div>
        <Button
          variant="outline"
          disabled={tasks.length === 0}
          onClick={() => exportTasksToExcel(tasks, year, month)}
        >
          <Download /> Excel
        </Button>
      </div>

      <MonthPicker
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
      />

      <div className="flex gap-2">
        {(
          [
            ['list', 'По дням', List],
            ['calendar', 'Календарь', CalendarDays],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              view === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Нет завершённых задач за выбранный месяц
        </div>
      ) : view === 'list' ? (
        <DayGroupedList tasks={tasks} onEdit={openEdit} onDelete={setDeleting} />
      ) : (
        <div className="space-y-4">
          <ReportsCalendar
            year={year}
            month={month}
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          {!selectedDate ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Выберите день в календаре, чтобы увидеть задачи
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Нет задач за {format(selectedDate, 'dd.MM.yyyy')}
            </div>
          ) : (
            <CompletedTasksTable
              tasks={dayTasks}
              onEdit={openEdit}
              onDelete={setDeleting}
              showCompletedColumn={false}
            />
          )}
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSubmit={async (values) => {
          if (!editing) return
          await updateTask(editing.id, values)
        }}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleting?.title}» будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return
                void deleteTask(deleting.id)
                setDeleting(null)
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
