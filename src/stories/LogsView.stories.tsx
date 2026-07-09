import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { LogsView } from '../components/logs/LogsView'
import type { LogsFilter, ServiceLogRow } from '../components/logs/types'

// ─── Sample data ──────────────────────────────────────────────────────────────

const now = Date.now()
const rel = (offsetMs: number) => new Date(now - offsetMs).toISOString()

const SAMPLE_LOGS: ServiceLogRow[] = [
  {
    id: '1',
    ts: rel(4_000),
    level: 'error',
    service: 'axon-crawler',
    component: 'collector',
    msg: 'Failed to fetch page: connection refused — https://example-target.io/feed',
    traceId: 'abc123def456',
    requestId: 'req-0001',
    attrs: { url: 'https://example-target.io/feed', statusCode: 503, retries: 3 },
  },
  {
    id: '2',
    ts: rel(12_000),
    level: 'warn',
    service: 'scout-collector',
    component: 'rate-limiter',
    msg: 'Rate limit approaching threshold — pausing for 30s',
    requestId: 'req-0002',
    attrs: { current: 95, limit: 100, windowSecs: 60 },
  },
  {
    id: '3',
    ts: rel(38_000),
    level: 'info',
    service: 'axon-crawler',
    component: 'scheduler',
    msg: 'Crawl job enqueued successfully',
    traceId: 'abc123def457',
    requestId: 'req-0003',
    attrs: { jobId: 'job-881', source: 'reuters.com', priority: 'high' },
  },
  {
    id: '4',
    ts: rel(61_000),
    level: 'info',
    service: 'cortex-gateway',
    component: 'router',
    msg: 'Model request dispatched to gemini-1.5-pro',
    traceId: 'xyz789',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    attrs: { model: 'gemini-1.5-pro', tokens: 1248, cached: false },
  },
  {
    id: '5',
    ts: rel(120_000),
    level: 'debug',
    service: 'sentra-pipeline',
    component: 'dedup',
    msg: 'Hash check: envelope e9f2a1 is duplicate — skipping',
    attrs: { hash: 'e9f2a1b3c4d5', existing_id: 42801 },
  },
  {
    id: '6',
    ts: rel(190_000),
    level: 'error',
    service: 'fort',
    component: 'gotrue-proxy',
    msg: 'GoTrue upstream returned 502 — retrying with exponential backoff',
    requestId: 'req-0006',
    attrs: { attempt: 2, nextRetryMs: 2000 },
  },
  {
    id: '7',
    ts: rel(250_000),
    level: 'info',
    service: 'scout-collector',
    component: 'plugin-manager',
    msg: 'Plugin searxng registered and healthy',
    attrs: { version: '1.3.2', endpoints: 2 },
  },
  {
    id: '8',
    ts: rel(310_000),
    level: 'warn',
    service: 'axon-firecrawl',
    component: 'scraper',
    msg: 'Response body truncated at 512 KB — possible malformed HTML',
    attrs: { url: 'https://news-archive.example.com/article/12345', truncatedAt: 524288 },
  },
  {
    id: '9',
    ts: rel(370_000),
    level: 'debug',
    service: 'cortex-gateway',
    component: 'cache',
    msg: 'Embedding cache hit — skipping inference',
    attrs: { cacheKey: 'emb:sha256:f1a2b3c4', vectorDims: 768 },
  },
  {
    id: '10',
    ts: rel(430_000),
    level: 'info',
    service: 'sentra-pipeline',
    component: 'enrichment',
    msg: 'Narrative enrichment complete — 5 entities linked',
    traceId: 'trace-narr-44',
    attrs: { narrativeId: 'narr-044', entityCount: 5, durationMs: 812 },
  },
]

const SERVICES = ['axon-crawler', 'axon-firecrawl', 'scout-collector', 'cortex-gateway', 'sentra-pipeline', 'fort']
const COMPONENTS = ['collector', 'scheduler', 'router', 'dedup', 'cache', 'enrichment', 'gotrue-proxy', 'rate-limiter', 'plugin-manager', 'scraper']

// ─── Controlled wrapper ───────────────────────────────────────────────────────

const ControlledLogsView = ({
  initialFilters = {},
  language = 'en' as const,
  logs = SAMPLE_LOGS,
  liveTail = false,
}: {
  initialFilters?: LogsFilter
  language?: 'en' | 'ar'
  logs?: ServiceLogRow[]
  liveTail?: boolean
}) => {
  const [filters, setFilters] = useState<LogsFilter>(initialFilters)
  const [live, setLive] = useState(liveTail)

  return (
    <LogsView
      logs={logs}
      filters={filters}
      onFilterChange={setFilters}
      language={language}
      services={SERVICES}
      components={COMPONENTS}
      liveTail={live}
      onToggleLiveTail={setLive}
      hasMore={false}
    />
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof LogsView> = {
  title: "Components/Logs View",
  component: LogsView,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof LogsView>

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Default — all log levels, EN, interactive filters.
 * Exercises: level badge colours, relative time, msg truncation, expand row.
 */
export const AllLevels: Story = {
  name: 'All Levels (EN)',
  render: () => <ControlledLogsView />,
}

/**
 * RTL — Arabic chrome, right-to-left layout.
 * Exercises: logical CSS (ps/pe/ms/me), RTL filter bar, RTL table.
 */
export const RTLArabic: Story = {
  name: 'RTL — Arabic',
  render: () => (
    <div dir="rtl" lang="ar">
      <ControlledLogsView language="ar" />
    </div>
  ),
}

/**
 * Dark mode — rendered inside a .dark wrapper.
 * Exercises: token colours in dark context (destructive, alert-amber, success).
 */
export const Dark: Story = {
  name: 'Dark Mode',
  render: () => (
    <div className="dark bg-background p-6 rounded-lg min-h-[500px]">
      <ControlledLogsView />
    </div>
  ),
}

/**
 * Empty state — no log entries matching the current filter.
 */
export const Empty: Story = {
  name: 'Empty State',
  render: () => (
    <LogsView
      logs={[]}
      filters={{}}
      onFilterChange={() => {}}
      language="en"
      services={SERVICES}
      components={COMPONENTS}
    />
  ),
}

/**
 * Empty state — Arabic.
 */
export const EmptyArabic: Story = {
  name: 'Empty State — Arabic',
  render: () => (
    <div dir="rtl" lang="ar">
      <LogsView
        logs={[]}
        filters={{}}
        onFilterChange={() => {}}
        language="ar"
        services={SERVICES}
        components={COMPONENTS}
      />
    </div>
  ),
}

/**
 * Loading skeleton — simulates first-load with no rows yet.
 */
export const Loading: Story = {
  name: 'Loading Skeleton',
  render: () => (
    <LogsView
      logs={[]}
      filters={{}}
      onFilterChange={() => {}}
      language="en"
      loading={true}
      services={SERVICES}
      components={COMPONENTS}
    />
  ),
}

/**
 * Errors only — pre-filtered to show only error rows.
 */
export const ErrorsOnly: Story = {
  name: 'Errors Only (filtered)',
  render: () => (
    <ControlledLogsView
      initialFilters={{ levels: ['error'] }}
    />
  ),
}

/**
 * Live tail active — shows the live toggle in green/spinning state.
 */
export const LiveTailActive: Story = {
  name: 'Live Tail Active',
  render: () => (
    <ControlledLogsView liveTail={true} />
  ),
}

/**
 * Load more — shows the "Load more" button when hasMore=true.
 */
export const WithLoadMore: Story = {
  name: 'With Load More',
  render: () => {
    const [filters, setFilters] = useState<LogsFilter>({})
    return (
      <LogsView
        logs={SAMPLE_LOGS.slice(0, 5)}
        filters={filters}
        onFilterChange={setFilters}
        language="en"
        services={SERVICES}
        components={COMPONENTS}
        hasMore={true}
        onLoadMore={() => alert('Load more triggered')}
      />
    )
  },
}
