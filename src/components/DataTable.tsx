import { Fragment } from 'react'
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
  onRowClick?: (
    row: Row<TData>,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void
  onRowKeyDown?: (
    row: Row<TData>,
    event: React.KeyboardEvent<HTMLTableRowElement>
  ) => void
  onContainerClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement
  disableHover?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onRowDoubleClick,
  onRowClick,
  onRowKeyDown: _onRowKeyDown,
  onContainerClick,
  renderSubComponent,
  disableHover = false,
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
        try {
          console.log(
            '[DataTable] container click',
            (e.target as HTMLElement)?.tagName
          )
        } catch {}
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
            const rowEl = target.closest(
              '[data-row-id]'
            ) as HTMLTableRowElement | null
            if (!rowEl) return
            const rowId = rowEl.getAttribute('data-row-id')
            const row = table.getRowModel().rows.find((r) => r.id === rowId)
            if (!row) return
            if (onRowClick) {
              try {
                console.log('[DataTable] row click', row.id)
              } catch {}
              onRowClick(row, e as React.MouseEvent<HTMLTableRowElement>)
            }
          }}
        >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() && 'selected'}
                  data-row-id={row.id}
                  className={
                    disableHover
                      ? '[&]:hover:bg-transparent'
                      : onRowDoubleClick || onRowClick
                        ? 'cursor-pointer'
                        : undefined
                  }
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && renderSubComponent && (
                  <TableRow key={`${row.id}-expanded`} className="hover:bg-transparent">
                    <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                      {renderSubComponent({ row })}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
