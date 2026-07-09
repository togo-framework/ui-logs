/**
 * types.ts — LogsView data contract
 *
 * Rule 25: product-agnostic seam — no fetching, no app/product imports.
 * Data arrives entirely as props.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ServiceLogRow {
  id: string
  /** ISO 8601 timestamp */
  ts: string
  level: LogLevel
  /** e.g. 'axon', 'scout-collector', 'firecrawl' */
  service: string
  /** optional subsystem label */
  component?: string
  msg: string
  traceId?: string
  requestId?: string
  userId?: string
  /** arbitrary structured metadata */
  attrs?: Record<string, unknown>
}

export interface LogsFilter {
  /** multiselect level filter — empty / undefined = all levels */
  levels?: string[]
  service?: string
  component?: string
  /** ISO date-time lower bound */
  since?: string
  /** ISO date-time upper bound */
  until?: string
  /** full-text search on msg */
  q?: string
}

export interface LogsViewProps {
  logs: ServiceLogRow[]
  filters: LogsFilter
  onFilterChange: (f: LogsFilter) => void
  /** EN or AR — drives all chrome labels and RTL direction */
  language: 'en' | 'ar'
  loading?: boolean
  /** called when the user reaches the bottom / clicks "load more" */
  onLoadMore?: () => void
  hasMore?: boolean
  /** options to populate the service dropdown */
  services?: string[]
  /** options to populate the component dropdown */
  components?: string[]
  /** whether live-tail polling is active */
  liveTail?: boolean
  onToggleLiveTail?: (on: boolean) => void
  className?: string
}
