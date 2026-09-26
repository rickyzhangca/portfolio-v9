import type {
  Browser,
  CDPSession,
  Locator,
  Page,
  Request,
  TestInfo,
} from "@playwright/test";
import { test as base } from "@playwright/test";

const MAX_HEAP_SAMPLES = 1000;
const MAX_REQUEST_EVENTS = 1000;
const HEAP_SAMPLE_INTERVAL_MS = 250;
const MEDIA_FILE_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".m3u8",
  ".mpd",
];
const BLOCKED_EXTERNAL_ORIGINS = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://portfolio-umami.haoyuzhangca2973.workers.dev",
] as const;
const BLOCKED_EXTERNAL_ORIGIN_SET = new Set<string>(BLOCKED_EXTERNAL_ORIGINS);
const BLOCKED_EXTERNAL_URL_PATTERNS = BLOCKED_EXTERNAL_ORIGINS.map(
  (origin) => `${origin}/*`
);

interface FrameAttribution {
  durationMs: number;
  executionStartMs: number;
  invoker: string;
  invokerType: string;
  sourceFunctionName: string;
  sourceUrl: string;
  forcedStyleAndLayoutDurationMs: number;
}

interface LongFrameRecord {
  startTimeMs: number;
  durationMs: number;
  renderStartMs: number;
  styleAndLayoutStartMs: number;
  blockingDurationMs: number;
  scripts: FrameAttribution[];
}

interface ResourceRecord {
  url: string;
  initiatorType: string;
  startTimeMs: number;
  durationMs: number;
  transferSizeBytes: number;
  encodedBodyBytes: number;
  decodedBodyBytes: number;
  isMedia: boolean;
}

interface DomSample {
  timeMs: number;
  elementCount: number;
  imageCount: number;
  videoCount: number;
}

interface NetworkRequestEvent {
  url: string;
  resourceType: string;
  startedAt: string;
  startedAtEpochMs: number;
  startOffsetMs: number;
  durationMs: number | null;
  responseStatus: number | null;
  contentLengthBytes: number | null;
  isMedia: boolean;
  completed: boolean;
  failure: string | null;
}

interface BrowserCaptureMetrics {
  label: string;
  durationMs: number;
  frameIntervalsMs: number[];
  droppedFrameSamples: number;
  longAnimationFrames: {
    supported: boolean;
    unavailableReason: string | null;
    records: LongFrameRecord[];
    droppedEntries: number;
  };
  resources: {
    records: ResourceRecord[];
    droppedEntries: number;
    unavailableReason: string | null;
  };
  domSamples: DomSample[];
  droppedDomSamples: number;
}

interface BrowserRecorder {
  startedAt: number;
  start: (label: string) => number;
  stop: () => BrowserCaptureMetrics | null;
}

declare global {
  interface Window {
    __portfolioPerformanceRecorder?: BrowserRecorder;
  }
}

interface HeapSample {
  sequence: number;
  capturedAt: string;
  usedBytes: number;
  totalBytes: number;
  embedderHeapUsedBytes: number;
  backingStorageBytes: number;
}

interface HeapTrend {
  source: "Chrome DevTools Protocol Runtime.getHeapUsage";
  supported: boolean;
  unavailableReason: string | null;
  sampleIntervalMs: number;
  sampleCount: number;
  droppedSamples: number;
  firstUsedBytes: number | null;
  lastUsedBytes: number | null;
  deltaUsedBytes: number | null;
  minimumUsedBytes: number | null;
  maximumUsedBytes: number | null;
  interpretation: string;
}

interface CaptureToken {
  startedAt: number;
  heapStartSequence: number;
  heapDroppedAtStart: number;
  requestStartEpochMs: number;
  requestDroppedAtStart: number;
}

export interface DurationSignal {
  durationMs: number;
  signal: string;
}

interface Distribution {
  sampleCount: number;
  minimumMs: number | null;
  p50Ms: number | null;
  p75Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maximumMs: number | null;
  over16_7Ms: number;
  over33_3Ms: number;
  over50Ms: number;
}

export interface PerformanceSample {
  scenario: string;
  phase: string;
  repetition: number;
  cpuThrottleRate: number | null;
  workload: Record<string, string | number | boolean>;
  browser: {
    engine: string;
    version: string;
    userAgent: string;
  };
  firstFeedback: DurationSignal;
  contentReady: DurationSignal;
  captureDurationMs: number;
  rafIntervalDistribution: Distribution & {
    proxyDescription: string;
    droppedSamples: number;
    samplesMs: number[];
  };
  longAnimationFrames: BrowserCaptureMetrics["longAnimationFrames"];
  network: {
    resourceTimingEntryCount: number;
    droppedResourceEntries: number;
    resourceTimingUnavailableReason: string | null;
    transferBytes: number;
    encodedBodyBytes: number;
    decodedBodyBytes: number;
    mediaResourceCount: number;
    mediaTransferBytes: number;
    mediaEncodedBodyBytes: number;
    mediaDecodedBodyBytes: number;
    requestEventCount: number;
    droppedRequestEvents: number;
    completedRequestCount: number;
    failedRequestCount: number;
    mediaRequestEventCount: number;
    knownContentLengthBytes: number;
    unknownContentLengthRequestCount: number;
    requests: NetworkRequestEvent[];
    entries: ResourceRecord[];
    byteNotes: string;
    requestEventNotes: string;
  };
  domTrend: {
    sampleIntervalMs: number;
    sampleCount: number;
    droppedSamples: number;
    firstElementCount: number | null;
    lastElementCount: number | null;
    deltaElementCount: number | null;
    minimumElementCount: number | null;
    maximumElementCount: number | null;
    firstImageCount: number | null;
    lastImageCount: number | null;
    firstVideoCount: number | null;
    lastVideoCount: number | null;
  };
  heapTrend: HeapTrend;
}

export interface PerformanceLab {
  readonly cpuThrottleRate: number | null;
  initialCapture: () => Promise<CaptureToken>;
  startCapture: (scenario: string, phase: string) => Promise<CaptureToken>;
  elapsedMs: (token: CaptureToken) => Promise<number>;
  firstContentfulPaint: (token: CaptureToken) => Promise<DurationSignal | null>;
  finishCapture: (
    token: CaptureToken,
    scenario: string,
    phase: string,
    firstFeedback: DurationSignal,
    contentReady: DurationSignal,
    workload: Record<string, string | number | boolean>
  ) => Promise<PerformanceSample>;
  attachSamples: (samples: PerformanceSample[]) => Promise<void>;
  cleanup: () => Promise<void>;
}

interface HeapUsageResponse {
  usedSize: number;
  totalSize: number;
  embedderHeapUsedSize: number;
  backingStorageSize: number;
}

class ChromiumHeapSampler {
  private readonly samples: HeapSample[] = [];
  private readonly cdp: CDPSession;
  private nextSequence = 0;
  private droppedSamples = 0;
  private unavailableReason: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sampling = false;

  constructor(cdp: CDPSession) {
    this.cdp = cdp;
  }

  async start(): Promise<void> {
    await this.takeSample();
    this.timer = setInterval(() => {
      this.takeSample().catch((error: unknown) => {
        this.unavailableReason =
          error instanceof Error ? error.message : String(error);
      });
    }, HEAP_SAMPLE_INTERVAL_MS);
  }

  async takeSample(): Promise<void> {
    if (this.sampling || this.unavailableReason) {
      return;
    }

    this.sampling = true;
    try {
      const usage = (await this.cdp.send(
        "Runtime.getHeapUsage"
      )) as HeapUsageResponse;

      if (
        !(Number.isFinite(usage.usedSize) && Number.isFinite(usage.totalSize))
      ) {
        this.unavailableReason = "Chromium returned invalid heap usage data";
        return;
      }

      if (this.samples.length >= MAX_HEAP_SAMPLES) {
        this.samples.shift();
        this.droppedSamples += 1;
      }

      this.samples.push({
        sequence: ++this.nextSequence,
        capturedAt: new Date().toISOString(),
        usedBytes: usage.usedSize,
        totalBytes: usage.totalSize,
        embedderHeapUsedBytes: usage.embedderHeapUsedSize,
        backingStorageBytes: usage.backingStorageSize,
      });
    } catch (error) {
      this.unavailableReason =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.sampling = false;
    }
  }

  nextSampleSequence(): number {
    return this.nextSequence + 1;
  }

  droppedCount(): number {
    return this.droppedSamples;
  }

  summarize(token: CaptureToken): HeapTrend {
    const phaseSamples = this.samples.filter(
      (sample) => sample.sequence >= token.heapStartSequence
    );
    const usedSizes = phaseSamples.map((sample) => sample.usedBytes);
    const firstUsedBytes = usedSizes[0] ?? null;
    const lastUsedBytes = usedSizes.at(-1) ?? null;

    return {
      source: "Chrome DevTools Protocol Runtime.getHeapUsage",
      supported: phaseSamples.length > 0 && !this.unavailableReason,
      unavailableReason: this.unavailableReason,
      sampleIntervalMs: HEAP_SAMPLE_INTERVAL_MS,
      sampleCount: phaseSamples.length,
      droppedSamples: this.droppedSamples - token.heapDroppedAtStart,
      firstUsedBytes,
      lastUsedBytes,
      deltaUsedBytes:
        firstUsedBytes === null || lastUsedBytes === null
          ? null
          : lastUsedBytes - firstUsedBytes,
      minimumUsedBytes: usedSizes.length ? Math.min(...usedSizes) : null,
      maximumUsedBytes: usedSizes.length ? Math.max(...usedSizes) : null,
      interpretation:
        this.unavailableReason ??
        "Short-run trend only; this does not establish or rule out a memory leak.",
    };
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.takeSample();
  }
}

const summarizeDistribution = (values: number[]): Distribution => {
  if (values.length === 0) {
    return {
      sampleCount: 0,
      minimumMs: null,
      p50Ms: null,
      p75Ms: null,
      p95Ms: null,
      p99Ms: null,
      maximumMs: null,
      over16_7Ms: 0,
      over33_3Ms: 0,
      over50Ms: 0,
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (value: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(value * sorted.length) - 1)] ??
    null;

  return {
    sampleCount: sorted.length,
    minimumMs: sorted[0] ?? null,
    p50Ms: percentile(0.5),
    p75Ms: percentile(0.75),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maximumMs: sorted.at(-1) ?? null,
    over16_7Ms: values.filter((value) => value > 16.7).length,
    over33_3Ms: values.filter((value) => value > 33.3).length,
    over50Ms: values.filter((value) => value > 50).length,
  };
};

const summarizeDom = (
  samples: DomSample[],
  droppedSamples: number
): PerformanceSample["domTrend"] => {
  const elementCounts = samples.map((sample) => sample.elementCount);
  return {
    sampleIntervalMs: 250,
    sampleCount: samples.length,
    droppedSamples,
    firstElementCount: elementCounts[0] ?? null,
    lastElementCount: elementCounts.at(-1) ?? null,
    deltaElementCount:
      elementCounts.length > 1
        ? (elementCounts.at(-1) ?? 0) - (elementCounts[0] ?? 0)
        : null,
    minimumElementCount: elementCounts.length
      ? Math.min(...elementCounts)
      : null,
    maximumElementCount: elementCounts.length
      ? Math.max(...elementCounts)
      : null,
    firstImageCount: samples[0]?.imageCount ?? null,
    lastImageCount: samples.at(-1)?.imageCount ?? null,
    firstVideoCount: samples[0]?.videoCount ?? null,
    lastVideoCount: samples.at(-1)?.videoCount ?? null,
  };
};

const createBrowserRecorder = async (page: Page): Promise<void> => {
  await page.addInitScript(
    (blockedOrigins: string[]) => {
      interface ActiveCapture {
        label: string;
        startedAt: number;
        active: boolean;
        lastFrameTime: number | null;
        frameIntervalsMs: number[];
        droppedFrameSamples: number;
        frameRequestId: number | null;
        longFrameObserver: PerformanceObserver | null;
        longFramesSupported: boolean;
        longFramesUnavailableReason: string | null;
        longFrames: LongFrameRecord[];
        droppedLongFrames: number;
        resourceObserver: PerformanceObserver | null;
        resources: ResourceRecord[];
        droppedResources: number;
        resourceTimingUnavailableReason: string | null;
        domIntervalId: number | null;
        domSamples: DomSample[];
        droppedDomSamples: number;
      }

      const FRAME_SAMPLE_LIMIT = 7200;
      const RESOURCE_ENTRY_LIMIT = 500;
      const LONG_FRAME_LIMIT = 100;
      const DOM_SAMPLE_LIMIT = 256;
      const MEDIA_EXTENSIONS = [
        ".mp4",
        ".m4v",
        ".mov",
        ".webm",
        ".m3u8",
        ".mpd",
      ];
      const blockedOriginSet = new Set(blockedOrigins);
      let activeCapture: ActiveCapture | null = null;

      const recordResource = (
        capture: ActiveCapture,
        entry: PerformanceEntry
      ) => {
        const resource = entry as PerformanceResourceTiming;
        if (resource.startTime < capture.startedAt) {
          return;
        }
        try {
          if (blockedOriginSet.has(new URL(resource.name).origin)) {
            return;
          }
        } catch {
          // Keep non-URL Resource Timing entries in the report.
        }

        if (capture.resources.length >= RESOURCE_ENTRY_LIMIT) {
          capture.droppedResources += 1;
          return;
        }
        const mediaPath = resource.name
          .toLowerCase()
          .split("?")[0]
          ?.split("#")[0];
        let sanitizedUrl = resource.name;
        try {
          const parsedUrl = new URL(resource.name);
          sanitizedUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
        } catch {
          sanitizedUrl = resource.name;
        }

        capture.resources.push({
          url: sanitizedUrl,
          initiatorType: resource.initiatorType,
          startTimeMs: resource.startTime - capture.startedAt,
          durationMs: resource.duration,
          transferSizeBytes: resource.transferSize || 0,
          encodedBodyBytes: resource.encodedBodySize || 0,
          decodedBodyBytes: resource.decodedBodySize || 0,
          isMedia: MEDIA_EXTENSIONS.some((extension) =>
            (mediaPath ?? "").endsWith(extension)
          ),
        });
      };

      const recordLongFrame = (
        capture: ActiveCapture,
        entry: PerformanceEntry
      ) => {
        if (capture.longFrames.length >= LONG_FRAME_LIMIT) {
          capture.droppedLongFrames += 1;
          return;
        }

        const longFrame = entry as PerformanceEntry & {
          blockingDuration?: number;
          renderStart?: number;
          scripts?: Array<{
            duration: number;
            executionStart: number;
            forcedStyleAndLayoutDuration: number;
            invoker: string;
            invokerType: string;
            sourceFunctionName: string;
            sourceURL: string;
          }>;
          styleAndLayoutStart?: number;
        };

        capture.longFrames.push({
          startTimeMs: longFrame.startTime - capture.startedAt,
          durationMs: longFrame.duration,
          renderStartMs: Math.max(
            0,
            (longFrame.renderStart ?? capture.startedAt) - capture.startedAt
          ),
          styleAndLayoutStartMs: Math.max(
            0,
            (longFrame.styleAndLayoutStart ?? capture.startedAt) -
              capture.startedAt
          ),
          blockingDurationMs: longFrame.blockingDuration ?? 0,
          scripts: (longFrame.scripts ?? []).slice(0, 12).map((script) => ({
            durationMs: script.duration,
            executionStartMs: Math.max(
              0,
              script.executionStart - capture.startedAt
            ),
            invoker: script.invoker,
            invokerType: script.invokerType,
            sourceFunctionName: script.sourceFunctionName,
            sourceUrl: script.sourceURL,
            forcedStyleAndLayoutDurationMs: script.forcedStyleAndLayoutDuration,
          })),
        });
      };

      const recordDomSample = (capture: ActiveCapture) => {
        if (!capture.active) {
          return;
        }
        if (capture.domSamples.length >= DOM_SAMPLE_LIMIT) {
          capture.droppedDomSamples += 1;
          return;
        }
        capture.domSamples.push({
          timeMs: performance.now() - capture.startedAt,
          elementCount: document.getElementsByTagName("*").length,
          imageCount: document.images.length,
          videoCount: document.querySelectorAll("video").length,
        });
      };

      const stopActiveCapture = (): BrowserCaptureMetrics | null => {
        const capture = activeCapture;
        if (!capture) {
          return null;
        }

        recordDomSample(capture);
        capture.active = false;
        if (capture.frameRequestId !== null) {
          window.cancelAnimationFrame(capture.frameRequestId);
        }
        if (capture.domIntervalId !== null) {
          window.clearInterval(capture.domIntervalId);
        }

        for (const [observer, callback] of [
          [capture.longFrameObserver, recordLongFrame],
          [capture.resourceObserver, recordResource],
        ] as const) {
          if (!observer) {
            continue;
          }
          for (const entry of observer.takeRecords()) {
            callback(capture, entry);
          }
          observer.disconnect();
        }

        const stoppedAt = performance.now();
        activeCapture = null;
        return {
          label: capture.label,
          durationMs: stoppedAt - capture.startedAt,
          frameIntervalsMs: capture.frameIntervalsMs,
          droppedFrameSamples: capture.droppedFrameSamples,
          longAnimationFrames: {
            supported: capture.longFramesSupported,
            unavailableReason: capture.longFramesUnavailableReason,
            records: capture.longFrames,
            droppedEntries: capture.droppedLongFrames,
          },
          resources: {
            records: capture.resources,
            droppedEntries: capture.droppedResources,
            unavailableReason: capture.resourceTimingUnavailableReason,
          },
          domSamples: capture.domSamples,
          droppedDomSamples: capture.droppedDomSamples,
        };
      };

      const startCapture = (label: string): number => {
        stopActiveCapture();
        const startedAt = performance.now();
        const capture: ActiveCapture = {
          label,
          startedAt,
          active: true,
          lastFrameTime: null,
          frameIntervalsMs: [],
          droppedFrameSamples: 0,
          frameRequestId: null,
          longFrameObserver: null,
          longFramesSupported: false,
          longFramesUnavailableReason: null,
          longFrames: [],
          droppedLongFrames: 0,
          resourceObserver: null,
          resources: [],
          droppedResources: 0,
          resourceTimingUnavailableReason: null,
          domIntervalId: null,
          domSamples: [],
          droppedDomSamples: 0,
        };
        activeCapture = capture;

        recordDomSample(capture);
        capture.domIntervalId = window.setInterval(
          () => recordDomSample(capture),
          250
        );

        const sampleFrame = (timestamp: number) => {
          if (!capture.active) {
            return;
          }
          if (capture.lastFrameTime !== null) {
            if (capture.frameIntervalsMs.length >= FRAME_SAMPLE_LIMIT) {
              capture.droppedFrameSamples += 1;
            } else {
              capture.frameIntervalsMs.push(timestamp - capture.lastFrameTime);
            }
          }
          capture.lastFrameTime = timestamp;
          capture.frameRequestId = window.requestAnimationFrame(sampleFrame);
        };
        capture.frameRequestId = window.requestAnimationFrame(sampleFrame);

        const supportedTypes = PerformanceObserver.supportedEntryTypes ?? [];
        capture.longFramesSupported = supportedTypes.includes(
          "long-animation-frame"
        );
        if (capture.longFramesSupported) {
          try {
            capture.longFrameObserver = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                recordLongFrame(capture, entry);
              }
            });
            capture.longFrameObserver.observe({
              type: "long-animation-frame",
              buffered: false,
            });
          } catch (error) {
            capture.longFramesSupported = false;
            capture.longFramesUnavailableReason =
              error instanceof Error ? error.message : String(error);
            capture.longFrameObserver?.disconnect();
            capture.longFrameObserver = null;
          }
        } else {
          capture.longFramesUnavailableReason =
            "PerformanceObserver does not list long-animation-frame";
        }

        try {
          capture.resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              recordResource(capture, entry);
            }
          });
          capture.resourceObserver.observe({
            type: "resource",
            buffered: true,
          });
        } catch (error) {
          capture.resourceObserver?.disconnect();
          capture.resourceObserver = null;
          capture.resourceTimingUnavailableReason =
            error instanceof Error ? error.message : String(error);
        }

        return startedAt;
      };

      window.__portfolioPerformanceRecorder = {
        startedAt: 0,
        start(label: string) {
          const startedAt = startCapture(label);
          this.startedAt = startedAt;
          return startedAt;
        },
        stop: stopActiveCapture,
      };
      window.__portfolioPerformanceRecorder.start("initial-navigation");
    },
    [...BLOCKED_EXTERNAL_ORIGINS]
  );
};

const getInitialSeed = (): number => {
  const rawSeed = process.env.PERF_SEED ?? "portfolio-perf-2026";
  const seedModulus = 2_147_483_647;
  let seed = 0;
  for (const character of rawSeed) {
    seed = (seed * 33 + character.charCodeAt(0)) % seedModulus;
  }
  return seed || 1;
};

const requestUrlPath = (value: string): string => {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value;
  }
};

const isBlockedExternalFixtureUrl = (value: string): boolean => {
  try {
    return BLOCKED_EXTERNAL_ORIGIN_SET.has(new URL(value).origin);
  } catch {
    return false;
  }
};

const isMediaRequest = (url: string, resourceType: string): boolean => {
  if (resourceType === "media") {
    return true;
  }
  const path = requestUrlPath(url).toLowerCase().split("?")[0]?.split("#")[0];
  return MEDIA_FILE_EXTENSIONS.some((extension) =>
    (path ?? "").endsWith(extension)
  );
};

const installDeterministicFixtures = async (
  page: Page,
  cdp: CDPSession
): Promise<void> => {
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
  await cdp.send("Network.setBlockedURLs", {
    urls: BLOCKED_EXTERNAL_URL_PATTERNS,
  });
  await page.addInitScript((seed) => {
    const modulus = 2_147_483_647;
    let state = seed % modulus;
    if (state <= 0) {
      state += modulus - 1;
    }
    Math.random = () => {
      state = (state * 16_807) % modulus;
      return (state - 1) / (modulus - 1);
    };
  }, getInitialSeed());
  await createBrowserRecorder(page);
};

const createLab = async (
  page: Page,
  browser: Browser,
  cdp: CDPSession,
  heapSampler: ChromiumHeapSampler,
  testInfo: TestInfo
): Promise<PerformanceLab> => {
  const requestRecords: NetworkRequestEvent[] = [];
  const requestRecordByRequest = new WeakMap<Request, NetworkRequestEvent>();
  let droppedRequestEvents = 0;

  page.on("request", (request) => {
    if (isBlockedExternalFixtureUrl(request.url())) {
      return;
    }
    if (requestRecords.length >= MAX_REQUEST_EVENTS) {
      droppedRequestEvents += 1;
      return;
    }

    let startedAtEpochMs = Date.now();
    try {
      const requestStartTime = request.timing().startTime;
      if (Number.isFinite(requestStartTime) && requestStartTime > 0) {
        startedAtEpochMs = requestStartTime;
      }
    } catch {
      startedAtEpochMs = Date.now();
    }
    const record: NetworkRequestEvent = {
      url: requestUrlPath(request.url()),
      resourceType: request.resourceType(),
      startedAt: new Date(startedAtEpochMs).toISOString(),
      startedAtEpochMs,
      startOffsetMs: 0,
      durationMs: null,
      responseStatus: null,
      contentLengthBytes: null,
      isMedia: isMediaRequest(request.url(), request.resourceType()),
      completed: false,
      failure: null,
    };
    requestRecords.push(record);
    requestRecordByRequest.set(request, record);
  });
  page.on("response", (response) => {
    const record = requestRecordByRequest.get(response.request());
    if (!record) {
      return;
    }
    record.responseStatus = response.status();
    const contentLength = response.headers()["content-length"];
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength >= 0) {
      record.contentLengthBytes = parsedLength;
    }
  });
  page.on("requestfinished", (request) => {
    const record = requestRecordByRequest.get(request);
    if (!record) {
      return;
    }
    record.durationMs = Math.max(0, Date.now() - record.startedAtEpochMs);
    record.completed = true;
    requestRecordByRequest.delete(request);
  });
  page.on("requestfailed", (request) => {
    const record = requestRecordByRequest.get(request);
    if (!record) {
      return;
    }
    record.durationMs = Math.max(0, Date.now() - record.startedAtEpochMs);
    record.failure = request.failure()?.errorText ?? "Request failed";
    requestRecordByRequest.delete(request);
  });

  const throttleValue = Number(process.env.PERF_CPU_THROTTLE_RATE);
  const cpuThrottleRate =
    Number.isFinite(throttleValue) && throttleValue > 1 ? throttleValue : null;

  if (cpuThrottleRate !== null) {
    await cdp.send("Emulation.setCPUThrottlingRate", {
      rate: cpuThrottleRate,
    });
  }

  const initialHeapSequence = heapSampler.nextSampleSequence();
  const initialHeapDropped = heapSampler.droppedCount();

  const startCapture = async (
    scenario: string,
    phase: string
  ): Promise<CaptureToken> => {
    const heapStartSequence = heapSampler.nextSampleSequence();
    const heapDroppedAtStart = heapSampler.droppedCount();
    const requestDroppedAtStart = droppedRequestEvents;
    const captureTiming = await page.evaluate((label) => {
      const startedAt =
        window.__portfolioPerformanceRecorder?.start(label) ??
        performance.now();
      return {
        startedAt,
        requestStartEpochMs: performance.timeOrigin + startedAt,
      };
    }, `${scenario}:${phase}`);
    await heapSampler.takeSample();
    return {
      startedAt: captureTiming.startedAt,
      heapStartSequence,
      heapDroppedAtStart,
      requestStartEpochMs: captureTiming.requestStartEpochMs,
      requestDroppedAtStart,
    };
  };

  const initialCapture = async (): Promise<CaptureToken> => {
    const captureTiming = await page.evaluate(() => {
      const startedAt =
        window.__portfolioPerformanceRecorder?.startedAt ?? performance.now();
      return {
        startedAt,
        requestStartEpochMs: performance.timeOrigin + startedAt,
      };
    });
    return {
      startedAt: captureTiming.startedAt,
      heapStartSequence: initialHeapSequence,
      heapDroppedAtStart: initialHeapDropped,
      requestStartEpochMs: captureTiming.requestStartEpochMs,
      requestDroppedAtStart: 0,
    };
  };

  const elapsedMs = async (token: CaptureToken): Promise<number> => {
    const now = await page.evaluate(() => performance.now());
    return Math.max(0, now - token.startedAt);
  };

  const firstContentfulPaint = async (
    token: CaptureToken
  ): Promise<DurationSignal | null> =>
    page.evaluate((startedAt) => {
      const entry = performance
        .getEntriesByType("paint")
        .find((candidate) => candidate.name === "first-contentful-paint");
      return entry
        ? {
            durationMs: Math.max(0, entry.startTime - startedAt),
            signal: "first-contentful-paint",
          }
        : null;
    }, token.startedAt);

  const finishCapture = async (
    token: CaptureToken,
    scenario: string,
    phase: string,
    firstFeedback: DurationSignal,
    contentReady: DurationSignal,
    workload: Record<string, string | number | boolean>
  ): Promise<PerformanceSample> => {
    const browserCapture = await page.evaluate(
      () => window.__portfolioPerformanceRecorder?.stop() ?? null
    );
    const requestsAtStop = requestRecords
      .filter(
        (request) => request.startedAtEpochMs >= token.requestStartEpochMs
      )
      .map((request) => ({
        ...request,
        startOffsetMs: Math.max(
          0,
          request.startedAtEpochMs - token.requestStartEpochMs
        ),
      }));
    const droppedRequestsAtStop = droppedRequestEvents;
    await heapSampler.takeSample();
    if (!browserCapture) {
      throw new Error(`No active browser capture for ${scenario}:${phase}`);
    }

    const userAgent = await page.evaluate(() => navigator.userAgent);
    const frameDistribution = summarizeDistribution(
      browserCapture.frameIntervalsMs
    );
    const resources = browserCapture.resources.records;
    const mediaResources = resources.filter((resource) => resource.isMedia);
    const requests = requestsAtStop;
    const mediaRequests = requests.filter((request) => request.isMedia);
    const sum = (values: number[]) =>
      values.reduce((total, value) => total + value, 0);

    return {
      scenario,
      phase,
      repetition: testInfo.repeatEachIndex + 1,
      cpuThrottleRate,
      workload,
      browser: {
        engine: browser.browserType().name(),
        version: browser.version(),
        userAgent,
      },
      firstFeedback: {
        ...firstFeedback,
        durationMs: Number(firstFeedback.durationMs.toFixed(2)),
      },
      contentReady: {
        ...contentReady,
        durationMs: Number(contentReady.durationMs.toFixed(2)),
      },
      captureDurationMs: Number(browserCapture.durationMs.toFixed(2)),
      rafIntervalDistribution: {
        ...frameDistribution,
        proxyDescription:
          "requestAnimationFrame callback interval; a scheduling proxy, not actual display FPS.",
        droppedSamples: browserCapture.droppedFrameSamples,
        samplesMs: browserCapture.frameIntervalsMs.map((value) =>
          Number(value.toFixed(2))
        ),
      },
      longAnimationFrames: browserCapture.longAnimationFrames,
      network: {
        resourceTimingEntryCount: resources.length,
        droppedResourceEntries: browserCapture.resources.droppedEntries,
        resourceTimingUnavailableReason:
          browserCapture.resources.unavailableReason,
        transferBytes: sum(
          resources.map((resource) => resource.transferSizeBytes)
        ),
        encodedBodyBytes: sum(
          resources.map((resource) => resource.encodedBodyBytes)
        ),
        decodedBodyBytes: sum(
          resources.map((resource) => resource.decodedBodyBytes)
        ),
        mediaResourceCount: mediaResources.length,
        mediaTransferBytes: sum(
          mediaResources.map((resource) => resource.transferSizeBytes)
        ),
        mediaEncodedBodyBytes: sum(
          mediaResources.map((resource) => resource.encodedBodyBytes)
        ),
        mediaDecodedBodyBytes: sum(
          mediaResources.map((resource) => resource.decodedBodyBytes)
        ),
        requestEventCount: requests.length,
        droppedRequestEvents:
          droppedRequestsAtStop - token.requestDroppedAtStart,
        completedRequestCount: requests.filter((request) => request.completed)
          .length,
        failedRequestCount: requests.filter(
          (request) => request.failure !== null
        ).length,
        mediaRequestEventCount: mediaRequests.length,
        knownContentLengthBytes: sum(
          requests.map((request) => request.contentLengthBytes ?? 0)
        ),
        unknownContentLengthRequestCount: requests.filter(
          (request) => request.contentLengthBytes === null
        ).length,
        requests,
        entries: resources,
        byteNotes:
          "Resource Timing byte counts; transferSize can be zero for cache hits or cross-origin resources. Encoded/decoded sizes are reported separately.",
        requestEventNotes:
          "Playwright request events include status, completion/failure and response Content-Length when available; unknown lengths remain null. Exact Google Fonts CSS/font and Umami origins blocked by CDP are excluded. Response bodies are not read.",
      },
      domTrend: summarizeDom(
        browserCapture.domSamples,
        browserCapture.droppedDomSamples
      ),
      heapTrend: heapSampler.summarize(token),
    };
  };

  return {
    cpuThrottleRate,
    initialCapture,
    startCapture,
    elapsedMs,
    firstContentfulPaint,
    finishCapture,
    attachSamples: async (samples) => {
      for (const sample of samples) {
        await testInfo.attach(
          `performance-${sample.scenario}-${sample.phase}.json`,
          {
            body: JSON.stringify(sample),
            contentType: "application/json",
          }
        );
      }
    },
    cleanup: async () => {
      try {
        await page.evaluate(() =>
          window.__portfolioPerformanceRecorder?.stop()
        );
      } catch {
        // The test may have failed before the first navigation.
      }
      await heapSampler.stop();
      await cdp.detach().catch(() => undefined);
    },
  };
};

export const test = base.extend<{ lab: PerformanceLab }>({
  lab: async ({ page, browser }, use, testInfo) => {
    const cdp = await page.context().newCDPSession(page);
    const heapSampler = new ChromiumHeapSampler(cdp);
    let lab: PerformanceLab | null = null;
    try {
      await installDeterministicFixtures(page, cdp);
      await cdp.send("Runtime.enable");
      await heapSampler.start();
      lab = await createLab(page, browser, cdp, heapSampler, testInfo);
      await use(lab);
    } finally {
      if (lab) {
        await lab.cleanup();
      } else {
        await heapSampler.stop();
        await cdp.detach().catch(() => undefined);
      }
    }
  },
});

export const waitForStableBox = async (
  locator: Locator,
  stableFrames = 5,
  timeoutMs = 10_000
): Promise<void> => {
  await locator.evaluate(
    (element, options) =>
      new Promise<void>((resolve, reject) => {
        let previous: number[] | null = null;
        let stableCount = 0;
        const beganAt = performance.now();

        const check = () => {
          const rect = element.getBoundingClientRect();
          const current = [rect.x, rect.y, rect.width, rect.height];
          if (
            previous &&
            current.every(
              (value, index) => Math.abs(value - (previous?.[index] ?? 0)) < 0.5
            )
          ) {
            stableCount += 1;
          } else {
            stableCount = 0;
          }
          previous = current;

          if (stableCount >= options.stableFrames) {
            resolve();
            return;
          }
          if (performance.now() - beganAt >= options.timeoutMs) {
            reject(
              new Error("Target layout did not settle during the guard window")
            );
            return;
          }
          requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
      }),
    { stableFrames, timeoutMs }
  );
};
