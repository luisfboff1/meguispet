import * as React from "react"
import {
  ColumnDef,
  ColumnResizeMode,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, ChevronDown, Columns } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableColumnResizing?: boolean
  enableSorting?: boolean
  enableColumnVisibility?: boolean
  mobileVisibleColumns?: string[] // IDs of columns to show on mobile by default
  initialColumnVisibility?: VisibilityState // Initial visibility state for columns
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableColumnResizing = true,
  enableSorting = true,
  enableColumnVisibility = true,
  mobileVisibleColumns = [],
  initialColumnVisibility = {},
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
  const [columnResizeMode] = React.useState<ColumnResizeMode>("onChange")
  const [isMobile, setIsMobile] = React.useState(false)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize column visibility based on screen size
  React.useEffect(() => {
    if (isMobile && mobileVisibleColumns.length > 0) {
      const mobileVisibility: VisibilityState = { ...initialColumnVisibility }
      columns.forEach((column) => {
        const columnDef = column as { id?: string; accessorKey?: string | number | symbol }
        const columnId = typeof column.id === 'string' ? column.id : 
                        columnDef.accessorKey?.toString() || ''
        if (columnId && !mobileVisibleColumns.includes(columnId)) {
          mobileVisibility[columnId] = false
        }
      })
      setColumnVisibility(mobileVisibility)
    } else if (!isMobile && Object.keys(columnVisibility).length === 0) {
      // Set initial visibility on desktop if not already set
      setColumnVisibility(initialColumnVisibility)
    }
  }, [isMobile, mobileVisibleColumns, columns, initialColumnVisibility])

  const table = useReactTable({
    data,
    columns,
    columnResizeMode,
    enableColumnResizing,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="w-full space-y-4">
      {/* Column Visibility Toggle */}
      {enableColumnVisibility && (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="ml-auto"
                size={isMobile ? "default" : "default"}
              >
                <Columns className="mr-2 h-4 w-4" />
                {isMobile ? 'Colunas' : 'Selecionar Colunas'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {typeof column.columnDef.header === 'string' 
                        ? column.columnDef.header 
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table style={{ width: '100%', minWidth: isMobile ? '600px' : 'auto' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        position: 'relative',
                        minWidth: '100px',
                        maxWidth: isMobile ? '200px' : 'none',
                      }}
                      className="whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                          {/* Resize Handle */}
                          {enableColumnResizing && header.column.getCanResize() && !isMobile && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                                header.column.getIsResizing() 
                                  ? 'opacity-100 bg-meguispet-primary' 
                                  : 'bg-meguispet-primary opacity-0 hover:opacity-100'
                              }`}
                            />
                          )}
                        </>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        minWidth: '100px',
                        maxWidth: isMobile ? '200px' : 'none',
                      }}
                    >
                      <div className={isMobile ? 'truncate' : ''}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Helper component for sortable column headers
export function SortableHeader<TData>({ 
  column, 
  children 
}: { 
  column: import('@tanstack/react-table').Column<TData, unknown>
  children: React.ReactNode 
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-4 h-8"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}
