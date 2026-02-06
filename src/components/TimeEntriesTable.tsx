import { CheckCircle, XCircle } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { DataTable } from './DataTable'
import { type ColumnDef } from '@tanstack/react-table'
import { useLocale } from '@/hooks/use-locale'
import { formatDate, formatDateTime, hoursToTime } from '@/lib/date-utils'

export type TimeEntryRow = {
  id: string
  title: string
  description?: string
  date: string
  hours: number
  approvedDate?: string
}

interface TimeEntriesTableProps {
  entries: TimeEntryRow[]
  onRowClick?: (entry: TimeEntryRow) => void
  showDescription?: boolean
}

export function TimeEntriesTable({
  entries,
  onRowClick,
  showDescription = true,
}: TimeEntriesTableProps) {
  const locale = useLocale()

  const columns: ColumnDef<TimeEntryRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      size: 110,
      cell: ({ getValue }) => (
        <Table.DateTimeCell className="w-[110px]">{formatDate(getValue() as string, locale)}</Table.DateTimeCell>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      size: 200,
      cell: ({ getValue }) => (
        <Table.TitleCell className="w-[200px]">{getValue() as string}</Table.TitleCell>
      ),
    },
    ...(showDescription
      ? [
          {
            accessorKey: 'description',
            header: 'Description',
            size: 250,
            cell: ({ getValue }: any) => {
              const description = getValue() as string | undefined
              return (
                <Table.SecondaryCell className="w-[250px] truncate">
                  {description || '-'}
                </Table.SecondaryCell>
              )
            },
          },
        ]
      : []),
    {
      accessorKey: 'hours',
      header: 'Time',
      size: 80,
      cell: ({ getValue }) => {
        const hours = getValue() as number
        return <Table.NumericCell className="w-[80px]">{hoursToTime(hours)}</Table.NumericCell>
      },
    },
    {
      id: 'approved-status',
      accessorKey: 'approvedDate',
      header: 'Approved',
      size: 90,
      cell: ({ getValue }) => {
        const approvedDate = getValue() as string | undefined
        return (
          <div className="w-[90px] flex items-center justify-center">
            {approvedDate ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300" />
            )}
          </div>
        )
      },
    },
    {
      id: 'approved-date',
      accessorKey: 'approvedDate',
      header: 'Approved Date',
      size: 180,
      cell: ({ getValue }) => {
        const approvedDate = getValue() as string | undefined
        return <Table.DateTimeCell className="w-[180px]">{approvedDate ? formatDateTime(approvedDate, locale) : '-'}</Table.DateTimeCell>
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowId={(row) => row.id}
      onRowDoubleClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
    />
  )
}
