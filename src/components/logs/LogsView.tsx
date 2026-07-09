'use client'
/**
 * LogsView — presentational per-product log viewer
 *
 * Rule 25: purely presentational; NO data fetching, NO context reads,
 *          NO product-specific imports. All data arrives as props.
 * Rule 16: semantic tokens only (no hex), logical CSS properties (ms/me/ps/pe).
 * Rule 8:  all chrome strings bilingual via `language` prop.
 * Rule 7:  displayName set; event handlers prefixed `handle*`.
 */

import React, { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Search, X } from 'lucide-react'

import {
  cn,
  formatRelativeTime,
  useDebounce,
  useInfiniteScroll,
  Badge,
  Button,
  Input,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Switch,
  ScrollArea,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@togo-framework/ui-core'

import type { LogLevel, LogsFilter, LogsViewProps, ServiceLogRow } from './types'

// ─── i18n labels ──────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    level: 'Level',
    service: 'Service',
    component: 'Component',
    search: 'Search messages…',
    since: 'Since',
    until: 'Until',
    allLevels: 'All levels',
    allServices: 'All services',
    allComponents: 'All components',
    liveTail: 'Live',
    loadMore: 'Load more',
    noLogs: 'No log entries found.',
    noLogsHint: 'Try adjusting the filters or time range.',
    loading: 'Loading logs…',
    traceId: 'Trace ID',
    requestId: 'Request ID',
    userId: 'User ID',
    attrs: 'Attributes',
    clear: 'Clear',
    filterBy: 'Filter by level',
  },
  ar: {
    level: 'المستوى',
    service: 'الخدمة',
    component: 'المكوّن',
    search: 'بحث في الرسائل…',
    since: 'منذ',
    until: 'حتى',
    allLevels: 'جميع المستويات',
    allServices: 'جميع الخدمات',
    allComponents: 'جميع المكونات',
    liveTail: 'مباشر',
    loadMore: 'تحميل المزيد',
    noLogs: 'لا توجد سجلات.',
    noLogsHint: 'حاول ضبط الفلاتر أو النطاق الزمني.',
    loading: 'جارٍ تحميل السجلات…',
    traceId: 'معرف التتبع',
    requestId: 'معرف الطلب',
    userId: 'معرف المستخدم',
    attrs: 'الخصائص',
    clear: 'مسح',
    filterBy: 'تصفية حسب المستوى',
  },
} as const

// ─── Level badge ──────────────────────────────────────────────────────────────

const LEVEL_CLASSES: Record<LogLevel, string> = {
  error: 'bg-destructive/15 text-destructive border-destructive/30',
  warn:  'bg-alert-amber/15 text-alert-amber border-alert-amber/30',
  info:  'bg-info/15 text-info border-info/30',
  debug: 'bg-muted text-muted-foreground border-border',
}

const LevelBadge = ({ level }: { level: LogLevel }) => (
  <Badge
    className={cn(
      'font-mono text-[10px] uppercase tracking-wide border',
      LEVEL_CLASSES[level] ?? LEVEL_CLASSES.debug,
    )}
  >
    {level}
  </Badge>
)
LevelBadge.displayName = 'LevelBadge'

// ─── Level multiselect (toggle buttons) ───────────────────────────────────────

const ALL_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug']

interface LevelFilterProps {
  selected: string[]
  onChange: (levels: string[]) => void
  ariaLabel: string
}

const LevelFilter = ({ selected, onChange, ariaLabel }: LevelFilterProps) => {
  const handleToggle = useCallback(
    (level: LogLevel) => {
      if (selected.includes(level)) {
        onChange(selected.filter((l) => l !== level))
      } else {
        onChange([...selected, level])
      }
    },
    [selected, onChange],
  )

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {ALL_LEVELS.map((level) => {
        const active = selected.length === 0 || selected.includes(level)
        return (
          <button
            key={level}
            type="button"
            onClick={() => handleToggle(level)}
            aria-pressed={selected.includes(level)}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              'transition-opacity duration-fast ease-standard cursor-pointer',
              LEVEL_CLASSES[level],
              !active && 'opacity-30',
            )}
          >
            {level}
          </button>
        )
      })}
    </div>
  )
}
LevelFilter.displayName = 'LevelFilter'

// ─── Expanded row detail ───────────────────────────────────────────────────────

type AnyLabels = (typeof LABELS)['en'] | (typeof LABELS)['ar']

interface ExpandedRowProps {
  row: ServiceLogRow
  labels: AnyLabels
}

const ExpandedRow = ({ row, labels }: ExpandedRowProps) => {
  const meta = [
    row.traceId   ? [labels.traceId,   row.traceId]   : null,
    row.requestId ? [labels.requestId, row.requestId] : null,
    row.userId    ? [labels.userId,    row.userId]    : null,
  ].filter(Boolean) as [string, string][]

  const hasAttrs = row.attrs && Object.keys(row.attrs).length > 0

  return (
    <div className="px-4 py-3 bg-muted/30 rounded-b-md border-t border-border space-y-3 text-xs">
      {/* Full message */}
      <p className="font-mono text-foreground break-all whitespace-pre-wrap leading-relaxed">
        {row.msg}
      </p>

      {/* Trace / request / user metadata */}
      {meta.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {meta.map(([key, val]) => (
            <React.Fragment key={key}>
              <dt className="text-muted-foreground font-medium">{key}</dt>
              <dd className="font-mono text-foreground truncate">{val}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}

      {/* Attrs */}
      {hasAttrs && (
        <div>
          <p className="text-muted-foreground font-medium mb-1">{labels.attrs}</p>
          <pre className="bg-card rounded p-2 overflow-x-auto text-foreground/80 border border-border leading-relaxed">
            {JSON.stringify(row.attrs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
ExpandedRow.displayName = 'ExpandedRow'

// ─── Loading skeleton ──────────────────────────────────────────────────────────

const LogsTableSkeleton = () => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
)
LogsTableSkeleton.displayName = 'LogsTableSkeleton'

// ─── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ label, hint }: { label: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
    <Search className="h-8 w-8 text-muted-foreground/40" aria-hidden />
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-xs text-muted-foreground/60">{hint}</p>
  </div>
)
EmptyState.displayName = 'EmptyState'

// ─── LogsView ─────────────────────────────────────────────────────────────────

const LogsView = ({
  logs,
  filters,
  onFilterChange,
  language,
  loading = false,
  onLoadMore,
  hasMore = false,
  services = [],
  components = [],
  liveTail = false,
  onToggleLiveTail,
  className,
}: LogsViewProps) => {
  const t = LABELS[language]
  const isRtl = language === 'ar'

  // Expanded rows — keyed by row id
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Local search state — debounced before calling onFilterChange
  const [localQ, setLocalQ] = useState(filters.q ?? '')
  const debouncedQ = useDebounce(localQ, 300)

  // Sync debounced search value into parent filter
  const prevDebouncedQ = React.useRef(debouncedQ)
  React.useEffect(() => {
    if (debouncedQ !== prevDebouncedQ.current) {
      prevDebouncedQ.current = debouncedQ
      onFilterChange({ ...filters, q: debouncedQ || undefined })
    }
  }, [debouncedQ, filters, onFilterChange])

  // Infinite scroll sentinel
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: onLoadMore ?? (() => {}),
    hasMore: hasMore && !loading,
    isLoading: loading,
  })

  // ── event handlers ──────────────────────────────────────────────────────────

  const handleToggleRow = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleLevelChange = useCallback(
    (levels: string[]) => {
      onFilterChange({ ...filters, levels: levels.length ? levels : undefined })
    },
    [filters, onFilterChange],
  )

  const handleServiceChange = useCallback(
    (val: string) => {
      onFilterChange({ ...filters, service: val === '__all__' ? undefined : val })
    },
    [filters, onFilterChange],
  )

  const handleComponentChange = useCallback(
    (val: string) => {
      onFilterChange({ ...filters, component: val === '__all__' ? undefined : val })
    },
    [filters, onFilterChange],
  )

  const handleSinceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ ...filters, since: e.target.value || undefined })
    },
    [filters, onFilterChange],
  )

  const handleUntilChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ ...filters, until: e.target.value || undefined })
    },
    [filters, onFilterChange],
  )

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQ(e.target.value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setLocalQ('')
    onFilterChange({ ...filters, q: undefined })
  }, [filters, onFilterChange])

  const handleToggleLiveTail = useCallback(() => {
    onToggleLiveTail?.(!liveTail)
  }, [liveTail, onToggleLiveTail])

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        {/* Level multiselect */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-muted-foreground font-medium">{t.level}</span>
          <LevelFilter
            selected={filters.levels ?? []}
            onChange={handleLevelChange}
            ariaLabel={t.filterBy}
          />
        </div>

        <div className="h-8 w-px bg-border hidden sm:block" aria-hidden />

        {/* Service dropdown */}
        {services.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs text-muted-foreground font-medium">{t.service}</span>
            <Select
              value={filters.service ?? '__all__'}
              onValueChange={handleServiceChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t.allServices} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t.allServices}</SelectItem>
                {services.map((svc) => (
                  <SelectItem key={svc} value={svc}>
                    {svc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Component dropdown */}
        {components.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs text-muted-foreground font-medium">{t.component}</span>
            <Select
              value={filters.component ?? '__all__'}
              onValueChange={handleComponentChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t.allComponents} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t.allComponents}</SelectItem>
                {components.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">{t.since}</span>
          <Input
            type="datetime-local"
            className="h-8 text-xs w-[160px]"
            value={filters.since ?? ''}
            onChange={handleSinceChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">{t.until}</span>
          <Input
            type="datetime-local"
            className="h-8 text-xs w-[160px]"
            value={filters.until ?? ''}
            onChange={handleUntilChange}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <span className="text-xs text-muted-foreground font-medium">{t.search.replace('…', '')}</span>
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
            <Input
              className={cn('h-8 text-xs ps-7 pe-7', isRtl && 'text-end')}
              placeholder={t.search}
              value={localQ}
              onChange={handleSearchChange}
              aria-label={t.search}
            />
            {localQ && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
                aria-label={t.clear}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live tail toggle */}
        {onToggleLiveTail && (
          <div className="flex items-center gap-2 ms-auto">
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-fast ease-standard',
                liveTail && 'animate-spin text-success',
              )}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground font-medium">{t.liveTail}</span>
            <Switch
              checked={liveTail}
              onCheckedChange={handleToggleLiveTail}
              aria-label={t.liveTail}
              className="data-[state=checked]:bg-success"
            />
          </div>
        )}
      </div>

      {/* Table area */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading && logs.length === 0 ? (
          <>
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
              {t.loading}
            </div>
            <LogsTableSkeleton />
          </>
        ) : logs.length === 0 ? (
          <EmptyState label={t.noLogs} hint={t.noLogsHint} />
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-6 ps-3" />
                  <TableHead className="w-[80px]">{t.level}</TableHead>
                  <TableHead className="w-[110px] text-muted-foreground font-medium">
                    {/* relative time column — no header label needed, context clear */}
                  </TableHead>
                  <TableHead className="w-[120px]">{t.service}</TableHead>
                  <TableHead className="w-[110px] hidden md:table-cell">
                    {t.component}
                  </TableHead>
                  <TableHead>{/* msg — takes remaining width */}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((row) => {
                  const isOpen = expanded.has(row.id)
                  const hasDetail =
                    row.traceId ||
                    row.requestId ||
                    row.userId ||
                    (row.attrs && Object.keys(row.attrs).length > 0)

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer transition-colors duration-fast ease-standard',
                          isOpen && 'bg-muted/30',
                          row.level === 'error' && 'bg-destructive/5 hover:bg-destructive/10',
                          row.level === 'warn'  && 'bg-alert-amber/5 hover:bg-alert-amber/10',
                        )}
                        onClick={() => handleToggleRow(row.id)}
                        aria-expanded={isOpen}
                      >
                        {/* Expand chevron */}
                        <TableCell className="ps-3 pe-0 w-6">
                          {hasDetail ? (
                            isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" aria-hidden />
                            )
                          ) : null}
                        </TableCell>

                        {/* Level */}
                        <TableCell className="pe-2">
                          <LevelBadge level={row.level} />
                        </TableCell>

                        {/* Relative time */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono pe-2">
                          <time dateTime={row.ts} title={row.ts}>
                            {formatRelativeTime(row.ts)}
                          </time>
                        </TableCell>

                        {/* Service */}
                        <TableCell className="text-xs font-medium text-foreground/80 pe-2 whitespace-nowrap">
                          {row.service}
                        </TableCell>

                        {/* Component */}
                        <TableCell className="text-xs text-muted-foreground pe-2 whitespace-nowrap hidden md:table-cell">
                          {row.component ?? '—'}
                        </TableCell>

                        {/* Message */}
                        <TableCell className="text-xs text-foreground max-w-0">
                          <p className="truncate">{row.msg}</p>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isOpen && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="p-0">
                            <ExpandedRow row={row} labels={t} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>

            {/* Infinite scroll sentinel */}
            {onLoadMore && (
              <div ref={sentinelRef} className="h-1" aria-hidden />
            )}

            {/* Explicit load more button (fallback / accessibility) */}
            {hasMore && !loading && onLoadMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  className="text-xs"
                >
                  {t.loadMore}
                </Button>
              </div>
            )}

            {/* Loading more indicator */}
            {loading && logs.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
LogsView.displayName = 'LogsView'

export { LogsView }
