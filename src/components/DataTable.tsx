import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  getRowId?: (originalRow: TData, index: number) => string
  onRowDoubleClick?: (row: Row<TData>) => void
  onRowClick?: (row: Row<TData>, event: React.MouseEvent<HTMLTableRowElement>) => void
  onRowKeyDown?: (row: Row<TData>, event: React.KeyboardEvent<HTMLTableRowElement>) => void
  onContainerClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onRowDoubleClick,
  onRowClick,
  onRowKeyDown,
  onContainerClick,
  renderExpandedRow,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <div
      className="rounded-md border"
      onClick={(e) => {
        // Temporary debug to verify click events reach the table container
        try { console.log('[DataTable] container click', (e.target as HTMLElement)?.tagName) } catch {}
        onContainerClick?.(e)
      }}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          onClick={(e) => {
            // Row-level event delegation: find nearest row and emit onRowClick
            const target = e.target as HTMLElement | null
            if (!target) return
            const rowEl = target.closest('[data-row-id]') as HTMLTableRowElement | null
            if (!rowEl) return
            const rowId = rowEl.getAttribute('data-row-id')
            const row = table.getRowModel().rows.find((r) => r.id === rowId)
            if (!row) return
            if (onRowClick) {
              try { console.log('[DataTable] row click', row.id) } catch {}
              onRowClick(row, e as React.MouseEvent<HTMLTableRowElement>)
            }
          }}
        >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <>
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  data-row-id={row.id}
                  className={onRowDoubleClick || onRowClick ? 'cursor-pointer' : undefined}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && renderExpandedRow && (
                  <TableRow key={`${row.id}-expanded`}>
                    <TableCell colSpan={columns.length} className="p-0">
                      {renderExpandedRow(row)}
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
