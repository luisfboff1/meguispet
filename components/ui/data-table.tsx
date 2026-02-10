import * as React from "react"
import {
  ColumnDef,
  ColumnResizeMode,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, ChevronDown, Columns, GripVertical, ChevronLeft, ChevronRight } from "lucide-react"

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
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableColumnResizing?: boolean
  enableSorting?: boolean
  enableColumnVisibility?: boolean
  enableColumnReordering?: boolean
  enablePagination?: boolean
  pageSize?: number
  tableId?: string // Unique identifier for localStorage persistence
  mobileVisibleColumns?: string[] // IDs of columns to show on mobile by default
  initialColumnVisibility?: VisibilityState // Initial visibility state for columns
  onRowClick?: (row: TData) => void // Optional row click handler
}

// ⚠️ REMOVED React.memo - was blocking data updates after mutations
// React.memo caused stale data issue where F5 wouldn't refresh
export function DataTable<TData, TValue>({
  columns,
  data,
  enableColumnResizing = true,
  enableSorting = true,
  enableColumnVisibility = true,
  enableColumnReordering = true,
  enablePagination = true,
  pageSize = 10,
  tableId = 'default-table',
  mobileVisibleColumns = [],
  initialColumnVisibility = {},
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
  const [columnResizeMode] = React.useState<ColumnResizeMode>("onChange")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })
  const [isMobile, setIsMobile] = React.useState(false)
  const isInitializedRef = React.useRef(false)
  const scrollContainerRef = useHorizontalScroll<HTMLDivElement>()
  const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load persisted preferences from localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const savedColumnOrder = localStorage.getItem(`table-column-order-${tableId}`)
    const savedColumnVisibility = localStorage.getItem(`table-column-visibility-${tableId}`)

    if (savedColumnOrder) {
      try {
        const parsedOrder = JSON.parse(savedColumnOrder) as ColumnOrderState
        setColumnOrder(parsedOrder)
      } catch (e) {
      }
    }

    if (savedColumnVisibility) {
      try {
        const parsedVisibility = JSON.parse(savedColumnVisibility) as VisibilityState
        setColumnVisibility(parsedVisibility)
      } catch (e) {
      }
    }
  }, [tableId])

  // Initialize column visibility based on screen size (ONCE on mount)
  React.useEffect(() => {
    // Prevent infinite loop: only run once on mount
    if (isInitializedRef.current) return

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
      isInitializedRef.current = true
    } else if (!isMobile) {
      // Set initial visibility on desktop
      setColumnVisibility(initialColumnVisibility)
      isInitializedRef.current = true
    }
  }, [isMobile, mobileVisibleColumns, columns, initialColumnVisibility])

  // Persist column order to localStorage
  React.useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem(`table-column-order-${tableId}`, JSON.stringify(columnOrder))
    }
  }, [columnOrder, tableId])

  // Persist column visibility to localStorage
  React.useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      localStorage.setItem(`table-column-visibility-${tableId}`, JSON.stringify(columnVisibility))
    }
  }, [columnVisibility, tableId])

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
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      pagination,
    },
  })

  // Drag and drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      return
    }

    const currentOrder = table.getState().columnOrder
    const allColumns = table.getAllColumns().map(col => col.id)
    const activeOrder = currentOrder.length > 0 ? currentOrder : allColumns

    const oldIndex = activeOrder.indexOf(draggedColumn)
    const newIndex = activeOrder.indexOf(targetColumnId)

    if (oldIndex === -1 || newIndex === -1) {
      setDraggedColumn(null)
      return
    }

    const newOrder = [...activeOrder]
    newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
    setDraggedColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

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
      <div ref={scrollContainerRef} className="rounded-md border overflow-x-auto">
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
                      className={`whitespace-nowrap ${draggedColumn === header.column.id ? 'opacity-50' : ''}`}
                      draggable={enableColumnReordering && !isMobile}
                      onDragStart={(e) => handleDragStart(e, header.column.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, header.column.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div className="flex items-center gap-1 truncate">
                            {/* Drag Handle */}
                            {enableColumnReordering && !isMobile && (
                              <div 
                                className="cursor-grab active:cursor-grabbing flex-shrink-0"
                                title="Arrastar para reordenar coluna"
                              >
                                <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </div>
                            )}
                            <div className="flex-1 truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
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
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
                  onClick={() => onRowClick?.(row.original)}
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

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            de {table.getFilteredRowModel().rows.length} resultado(s)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="text-sm font-medium">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
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
