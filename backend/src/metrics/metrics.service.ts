import { Injectable } from '@nestjs/common';

const BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

type Histogram = { counts: number[]; sum: number; count: number };

/**
 * Minimal Prometheus-format metrics without an extra dependency:
 * request counts by route/status, latency histogram, and a few gauges the health check fills in.
 */
@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, number>();
  private readonly latency = new Map<string, Histogram>();
  private readonly gauges = new Map<string, number>();
  private readonly startedAt = Date.now();

  observe(method: string, route: string, status: number, durationMs: number) {
    const key = `${method}|${route}|${status}`;
    this.requests.set(key, (this.requests.get(key) || 0) + 1);

    const hKey = `${method}|${route}`;
    const histogram = this.latency.get(hKey) || { counts: new Array(BUCKETS_MS.length + 1).fill(0), sum: 0, count: 0 };
    let placed = false;
    for (let index = 0; index < BUCKETS_MS.length; index += 1) {
      if (durationMs <= BUCKETS_MS[index]) {
        histogram.counts[index] += 1;
        placed = true;
        break;
      }
    }
    if (!placed) histogram.counts[BUCKETS_MS.length] += 1;
    histogram.sum += durationMs;
    histogram.count += 1;
    this.latency.set(hKey, histogram);
  }

  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  render(): string {
    const lines: string[] = [];
    const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    lines.push('# TYPE sombetini_uptime_seconds gauge');
    lines.push(`sombetini_uptime_seconds ${Math.round((Date.now() - this.startedAt) / 1000)}`);

    lines.push('# TYPE sombetini_http_requests_total counter');
    for (const [key, value] of this.requests) {
      const [method, route, status] = key.split('|');
      lines.push(`sombetini_http_requests_total{method="${method}",route="${esc(route)}",status="${status}"} ${value}`);
    }

    lines.push('# TYPE sombetini_http_request_duration_ms histogram');
    for (const [key, histogram] of this.latency) {
      const [method, route] = key.split('|');
      const labels = `method="${method}",route="${esc(route)}"`;
      let cumulative = 0;
      BUCKETS_MS.forEach((bucket, index) => {
        cumulative += histogram.counts[index];
        lines.push(`sombetini_http_request_duration_ms_bucket{${labels},le="${bucket}"} ${cumulative}`);
      });
      cumulative += histogram.counts[BUCKETS_MS.length];
      lines.push(`sombetini_http_request_duration_ms_bucket{${labels},le="+Inf"} ${cumulative}`);
      lines.push(`sombetini_http_request_duration_ms_sum{${labels}} ${Math.round(histogram.sum)}`);
      lines.push(`sombetini_http_request_duration_ms_count{${labels}} ${histogram.count}`);
    }

    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }

    const memory = process.memoryUsage();
    lines.push('# TYPE sombetini_process_rss_bytes gauge');
    lines.push(`sombetini_process_rss_bytes ${memory.rss}`);
    lines.push('# TYPE sombetini_process_heap_used_bytes gauge');
    lines.push(`sombetini_process_heap_used_bytes ${memory.heapUsed}`);

    return `${lines.join('\n')}\n`;
  }
}
