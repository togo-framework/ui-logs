<!-- togo-header -->
# @togo-framework/ui-logs

> [!WARNING]
> **Deprecated.** This package is no longer maintained. togo now uses
> [Nasaq](https://nasaq.fadymondy.com) (`@fadymondy/nasaq`) as its default UI kit:
> new apps from `create-togo-app` and the official plugins are built on it.
> Install it with `npm i @fadymondy/nasaq` and import from `@fadymondy/nasaq/web`.

Raw / live-tail log viewer from the togo UI kit. Presentational — no data
fetching, all data arrives as props.

```bash
npm install @togo-framework/ui-core @togo-framework/ui-logs
```

```tsx
import "@togo-framework/ui-core/styles.css";
import { LogsView } from "@togo-framework/ui-logs";
```

Split out of the former monolithic `@togo-framework/ui` package so apps can
install only what they use.
<!-- togo-sponsors -->
