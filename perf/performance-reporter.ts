import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, release, totalmem } from "node:os";
import { resolve } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import type { PerformanceSample } from "./performance-support";

interface TestRunRecord {
  title: string;
  project: string;
  repetition: number;
  status: string;
  expectedStatus: string;
  durationMs: number;
  errors: string[];
  sampleCount: number;
  expectedSampleCount: number | null;
}

interface NumericSummary {
  count: number;
  minimum: number | null;
  median: number | null;
  maximum: number | null;
}

interface ScenarioSummary {
  scenario: string;
  phase: string;
  repetitionCount: number;
  firstFeedbackMs: NumericSummary;
  contentReadyMs: NumericSummary;
  captureDurationMs: NumericSummary;
  rafIntervalP50MsAcrossRuns: NumericSummary;
  rafIntervalP95MsAcrossRuns: NumericSummary;
  longAnimationFrameCount: number;
  longAnimationFrameAttributions: string[];
  loafSupportedRuns: number;
  rafIntervalSampleCount: number;
  resourceTimingEntryCount: number;
  transferBytes: number;
  encodedBodyBytes: number;
  decodedBodyBytes: number;
  mediaResourceCount: number;
  mediaTransferBytes: number;
  mediaEncodedBodyBytes: number;
  mediaDecodedBodyBytes: number;
  requestEventCount: number;
  completedRequestCount: number;
  failedRequestCount: number;
  mediaRequestEventCount: number;
  knownContentLengthBytes: number;
  unknownContentLengthRequestCount: number;
  domElementCountDelta: NumericSummary;
  chromiumHeapUsedDeltaBytes: NumericSummary;
}

const percentile = (
  sortedValues: number[],
  proportion: number
): number | null =>
  sortedValues.length
    ? (sortedValues[
        Math.min(
          sortedValues.length - 1,
          Math.ceil(proportion * sortedValues.length) - 1
        )
      ] ?? null)
    : null;

const summarize = (
  values: Array<number | null | undefined>
): NumericSummary => {
  const sorted = values
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    )
    .sort((left, right) => left - right);

  return {
    count: sorted.length,
    minimum: sorted[0] ?? null,
    median: percentile(sorted, 0.5),
    maximum: sorted.at(-1) ?? null,
  };
};

const getBuildRevision = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
};

const getBuildFingerprint = (): {
  value: string;
  source: string;
} => {
  const manifestPath = resolve(
    process.cwd(),
    "dist/client/.vite/manifest.json"
  );
  if (!existsSync(manifestPath)) {
    return {
      value: "unavailable",
      source: "dist/client/.vite/manifest.json was not present",
    };
  }
  try {
    const digest = createHash("sha256")
      .update(readFileSync(manifestPath))
      .digest("hex");
    return {
      value: `vite-manifest-sha256:${digest}`,
      source: "dist/client/.vite/manifest.json",
    };
  } catch (error) {
    return {
      value: "unavailable",
      source: error instanceof Error ? error.message : String(error),
    };
  }
};

const hasTrackedWorktreeChanges = (): boolean => {
  try {
    execFileSync("git", ["diff", "--quiet"], {
      cwd: process.cwd(),
      stdio: "ignore",
    });
    execFileSync("git", ["diff", "--cached", "--quiet"], {
      cwd: process.cwd(),
      stdio: "ignore",
    });
    return false;
  } catch {
    return true;
  }
};

const getPlaywrightVersion = (): string => {
  try {
    const packagePath = resolve(
      process.cwd(),
      "node_modules/@playwright/test/package.json"
    );
    const packageInfo = JSON.parse(readFileSync(packagePath, "utf8")) as {
      version?: string;
    };
    return packageInfo.version ?? "unknown";
  } catch {
    return "unknown";
  }
};

const summarizeScenarios = (
  samples: PerformanceSample[]
): ScenarioSummary[] => {
  const groups = new Map<string, PerformanceSample[]>();
  for (const sample of samples) {
    const key = `${sample.scenario}\u0000${sample.phase}`;
    const existing = groups.get(key) ?? [];
    existing.push(sample);
    groups.set(key, existing);
  }

  return [...groups.values()].map((group) => {
    const first = group[0];
    if (!first) {
      throw new Error("Scenario grouping produced an empty sample set");
    }
    const attributionCounts = new Map<string, number>();
    for (const sample of group) {
      for (const frame of sample.longAnimationFrames.records) {
        for (const script of frame.scripts) {
          const attribution =
            script.sourceUrl ||
            script.sourceFunctionName ||
            script.invoker ||
            "unknown script";
          attributionCounts.set(
            attribution,
            (attributionCounts.get(attribution) ?? 0) + 1
          );
        }
      }
    }
    return {
      scenario: first.scenario,
      phase: first.phase,
      repetitionCount: group.length,
      firstFeedbackMs: summarize(
        group.map((sample) => sample.firstFeedback.durationMs)
      ),
      contentReadyMs: summarize(
        group.map((sample) => sample.contentReady.durationMs)
      ),
      captureDurationMs: summarize(
        group.map((sample) => sample.captureDurationMs)
      ),
      rafIntervalP50MsAcrossRuns: summarize(
        group.map((sample) => sample.rafIntervalDistribution.p50Ms)
      ),
      rafIntervalP95MsAcrossRuns: summarize(
        group.map((sample) => sample.rafIntervalDistribution.p95Ms)
      ),
      longAnimationFrameCount: group.reduce(
        (total, sample) => total + sample.longAnimationFrames.records.length,
        0
      ),
      longAnimationFrameAttributions: [...attributionCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([source, count]) => `${source} (${count})`),
      loafSupportedRuns: group.filter(
        (sample) => sample.longAnimationFrames.supported
      ).length,
      rafIntervalSampleCount: group.reduce(
        (total, sample) => total + sample.rafIntervalDistribution.sampleCount,
        0
      ),
      resourceTimingEntryCount: group.reduce(
        (total, sample) => total + sample.network.resourceTimingEntryCount,
        0
      ),
      transferBytes: group.reduce(
        (total, sample) => total + sample.network.transferBytes,
        0
      ),
      encodedBodyBytes: group.reduce(
        (total, sample) => total + sample.network.encodedBodyBytes,
        0
      ),
      decodedBodyBytes: group.reduce(
        (total, sample) => total + sample.network.decodedBodyBytes,
        0
      ),
      mediaResourceCount: group.reduce(
        (total, sample) => total + sample.network.mediaResourceCount,
        0
      ),
      mediaTransferBytes: group.reduce(
        (total, sample) => total + sample.network.mediaTransferBytes,
        0
      ),
      mediaEncodedBodyBytes: group.reduce(
        (total, sample) => total + sample.network.mediaEncodedBodyBytes,
        0
      ),
      mediaDecodedBodyBytes: group.reduce(
        (total, sample) => total + sample.network.mediaDecodedBodyBytes,
        0
      ),
      requestEventCount: group.reduce(
        (total, sample) => total + sample.network.requestEventCount,
        0
      ),
      completedRequestCount: group.reduce(
        (total, sample) => total + sample.network.completedRequestCount,
        0
      ),
      failedRequestCount: group.reduce(
        (total, sample) => total + sample.network.failedRequestCount,
        0
      ),
      mediaRequestEventCount: group.reduce(
        (total, sample) => total + sample.network.mediaRequestEventCount,
        0
      ),
      knownContentLengthBytes: group.reduce(
        (total, sample) => total + sample.network.knownContentLengthBytes,
        0
      ),
      unknownContentLengthRequestCount: group.reduce(
        (total, sample) =>
          total + sample.network.unknownContentLengthRequestCount,
        0
      ),
      domElementCountDelta: summarize(
        group.map((sample) => sample.domTrend.deltaElementCount)
      ),
      chromiumHeapUsedDeltaBytes: summarize(
        group.map((sample) => sample.heapTrend.deltaUsedBytes)
      ),
    };
  });
};

const formatSummary = (summary: NumericSummary, suffix = "ms"): string => {
  if (summary.count === 0) {
    return "unavailable";
  }
  return `median ${summary.median?.toFixed(2)}${suffix} (range ${summary.minimum?.toFixed(2)}–${summary.maximum?.toFixed(2)}${suffix})`;
};

const renderHumanSummary = (report: {
  status: string;
  buildRevision: string;
  buildFingerprintSource: string;
  sourceCheckoutRevision: string;
  buildKind: string;
  trackedWorktreeChangesPresent: boolean;
  repetitions: number;
  testRunCount: number;
  expectedTestRunCount: number;
  sampleCount: number;
  expectedSampleCount: number;
  attachmentParseFailureCount: number;
  validationErrors: string[];
  environment: {
    platform: string;
    architecture: string;
    nodeVersion: string;
    playwrightVersion: string;
    cpuModel: string;
    logicalCpuCount: number;
    totalMemoryBytes: number;
    browsers: string[];
    browserVersions: string[];
    cpuThrottleRate: number | null;
  };
  scenarios: ScenarioSummary[];
}): string => {
  const lines = [
    "Lab-only Playwright interaction performance summary",
    `Overall status: ${report.status}`,
    `Build fingerprint: ${report.buildRevision}`,
    `Build fingerprint source: ${report.buildFingerprintSource}`,
    `Source checkout revision: ${report.sourceCheckoutRevision}`,
    `Build kind: ${report.buildKind}`,
    `Tracked checkout changes were present at report time: ${report.trackedWorktreeChangesPresent}`,
    `Runs: ${report.testRunCount}/${report.expectedTestRunCount} test runs; ${report.sampleCount}/${report.expectedSampleCount} phase samples`,
    `Performance attachment parse failures: ${report.attachmentParseFailureCount}`,
    ...report.validationErrors.map((error) => `Validation error: ${error}`),
    `Configured repetitions per scenario: ${report.repetitions}`,
    `Environment: ${report.environment.platform}/${report.environment.architecture}; Node ${report.environment.nodeVersion}; Playwright ${report.environment.playwrightVersion}`,
    `CPU: ${report.environment.cpuModel} (${report.environment.logicalCpuCount} logical CPUs); memory ${report.environment.totalMemoryBytes} bytes`,
    `Browser: ${report.environment.browsers.join(", ") || "unavailable"}`,
    report.environment.cpuThrottleRate
      ? `CDP CPU throttle: ${report.environment.cpuThrottleRate}x (CPU-only simulation, not a physical-device profile)`
      : "CDP CPU throttle: not applied",
    "",
    "Per-scenario phase summaries:",
  ];

  for (const scenario of report.scenarios) {
    lines.push(
      `- ${scenario.scenario} / ${scenario.phase} (${scenario.repetitionCount} repetitions)`,
      `  First feedback: ${formatSummary(scenario.firstFeedbackMs)}`,
      `  Content ready: ${formatSummary(scenario.contentReadyMs)}`,
      `  Capture duration: ${formatSummary(scenario.captureDurationMs)}`,
      `  rAF intervals sampled (SUM across ${scenario.repetitionCount} repetitions): ${scenario.rafIntervalSampleCount}; interval p50/p95 across runs: ${formatSummary(scenario.rafIntervalP50MsAcrossRuns)} / ${formatSummary(scenario.rafIntervalP95MsAcrossRuns)}`,
      `  Long Animation Frames (SUM across ${scenario.repetitionCount} repetitions): ${scenario.longAnimationFrameCount}; LoAF observer supported on ${scenario.loafSupportedRuns}/${scenario.repetitionCount} runs`,
      `  LoAF script attribution (event counts summed across repetitions): ${scenario.longAnimationFrameAttributions.join(", ") || "none recorded"}`,
      `  Network event counts (SUM across ${scenario.repetitionCount} repetitions): requests started/completed/failed ${scenario.requestEventCount}/${scenario.completedRequestCount}/${scenario.failedRequestCount}; media request events ${scenario.mediaRequestEventCount}; unknown-length requests ${scenario.unknownContentLengthRequestCount}`,
      `  Network byte totals (SUM across ${scenario.repetitionCount} repetitions): known Content-Length ${scenario.knownContentLengthBytes}; Resource Timing transfer/encoded/decoded ${scenario.transferBytes}/${scenario.encodedBodyBytes}/${scenario.decodedBodyBytes}`,
      `  Media resource entries (SUM across ${scenario.repetitionCount} repetitions): ${scenario.mediaResourceCount}; transfer/encoded/decoded bytes ${scenario.mediaTransferBytes}/${scenario.mediaEncodedBodyBytes}/${scenario.mediaDecodedBodyBytes}`,
      `  Resource Timing entries (SUM across ${scenario.repetitionCount} repetitions): ${scenario.resourceTimingEntryCount}`,
      `  DOM element-count delta: ${formatSummary(scenario.domElementCountDelta, " elements")}`,
      `  Chromium heap-used delta: ${formatSummary(scenario.chromiumHeapUsedDeltaBytes, " bytes")}`
    );
  }

  lines.push(
    "",
    "Interpretation notes:",
    "- requestAnimationFrame intervals are scheduling proxies, not actual display FPS.",
    "- First-feedback/content-ready timings end at the named scenario signal and are lab timings, not field INP or real-user latency.",
    "- DOM and Chromium heap samples are short-run trends, not evidence of memory leakage.",
    "- Long Animation Frames are feature-detected; attribution is limited to browser-provided script fields.",
    "- Resource byte totals use Resource Timing. transferSize may be zero for cache hits or cross-origin resources.",
    "- Playwright request events include status and response Content-Length when available; response bodies are not read.",
    "- Exact Google Fonts CSS/font and Umami analytics origins are blocked through CDP Network.setBlockedURLs; Playwright route interception is not used, and Chromium HTTP cache remains enabled.",
    "- Blocked external fonts use browser fallback fonts, so typography and resulting layout are less realistic than the production site.",
    "- Production images and videos still load from the preview build.",
    "- Site animations remain enabled. No performance pass/fail timing thresholds are applied.",
    "- A CDP CPU throttle changes CPU scheduling only and is not a real device or network profile."
  );
  return `${lines.join("\n")}\n`;
};

export default class PerformanceReporter implements Reporter {
  private repetitions = 1;
  private expectedTestRunCount = 0;
  private startedAt = new Date().toISOString();
  private buildRevision = "unavailable";
  private buildFingerprintSource = "unavailable";
  private sourceCheckoutRevision = "unavailable";
  private buildKind = "unknown";
  private trackedWorktreeChangesPresent = false;
  private readonly testRuns: TestRunRecord[] = [];
  private readonly samples: PerformanceSample[] = [];
  private readonly attachmentParseFailures: string[] = [];
  private readonly validationErrors: string[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.repetitions = Number(process.env.PERF_REPETITIONS ?? "3");
    this.expectedTestRunCount = suite.allTests().length;
    this.startedAt = new Date().toISOString();
    this.sourceCheckoutRevision = getBuildRevision();
    this.buildKind =
      process.env.PERF_USE_EXISTING_DIST === "1"
        ? "prebuilt dist used; relation to source checkout is unverified"
        : "fresh production build requested by the performance config";
    this.trackedWorktreeChangesPresent = hasTrackedWorktreeChanges();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testSamples: PerformanceSample[] = [];
    const attachmentParseErrors: string[] = [];
    for (const attachment of result.attachments) {
      if (
        !(
          attachment.name.startsWith("performance-") &&
          attachment.name.endsWith(".json")
        )
      ) {
        continue;
      }

      try {
        let body = "";
        if (attachment.body) {
          body = attachment.body.toString();
        } else if (attachment.path) {
          body = readFileSync(attachment.path, "utf8");
        }
        if (body) {
          testSamples.push(JSON.parse(body) as PerformanceSample);
        } else {
          attachmentParseErrors.push(
            `${attachment.name}: attachment had no readable body`
          );
        }
      } catch (error) {
        attachmentParseErrors.push(
          `${attachment.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const expectedSampleAnnotations = test.annotations.filter(
      (annotation) => annotation.type === "performance-sample-count"
    );
    const expectedSampleCountText =
      expectedSampleAnnotations.at(-1)?.description;
    const expectedSampleCount =
      expectedSampleCountText === undefined
        ? null
        : Number(expectedSampleCountText);
    if (
      expectedSampleCount === null ||
      !Number.isSafeInteger(expectedSampleCount) ||
      expectedSampleCount < 1
    ) {
      this.validationErrors.push(
        `${test.title}: missing or invalid performance-sample-count annotation`
      );
    }
    for (const error of attachmentParseErrors) {
      this.attachmentParseFailures.push(`${test.title}: ${error}`);
    }

    this.samples.push(...testSamples);
    this.testRuns.push({
      title: test.title,
      project: test.parent.project()?.name ?? "unknown",
      repetition: test.repeatEachIndex + 1,
      status:
        result.status === "passed" && attachmentParseErrors.length > 0
          ? "failed"
          : result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      errors: [
        ...result.errors.map(
          (error) => error.message ?? error.stack ?? "Unknown test error"
        ),
        ...attachmentParseErrors,
      ],
      sampleCount: testSamples.length,
      expectedSampleCount:
        expectedSampleCount !== null &&
        Number.isSafeInteger(expectedSampleCount) &&
        expectedSampleCount >= 1
          ? expectedSampleCount
          : null,
    });
  }

  onEnd(
    result: FullResult
  ): Promise<{ status?: FullResult["status"] } | undefined> {
    if (process.argv.includes("--list")) {
      return Promise.resolve(undefined);
    }
    if (this.testRuns.length !== this.expectedTestRunCount) {
      this.validationErrors.push(
        `Observed ${this.testRuns.length} test runs; expected ${this.expectedTestRunCount}`
      );
    }
    for (const testRun of this.testRuns) {
      if (
        testRun.expectedSampleCount !== null &&
        testRun.sampleCount !== testRun.expectedSampleCount
      ) {
        this.validationErrors.push(
          `${testRun.title} (repetition ${testRun.repetition}): captured ${testRun.sampleCount} phase samples; expected ${testRun.expectedSampleCount}`
        );
      }
    }

    const expectedSampleCount = this.testRuns.reduce(
      (total, testRun) => total + (testRun.expectedSampleCount ?? 0),
      0
    );
    const buildFingerprint = getBuildFingerprint();
    if (buildFingerprint.value === "unavailable") {
      this.validationErrors.push(
        `Build fingerprint unavailable: ${buildFingerprint.source}`
      );
    }
    const successfulRuns = this.testRuns.filter(
      (testRun) => testRun.status === "passed"
    ).length;
    const passed =
      result.status === "passed" &&
      expectedSampleCount > 0 &&
      this.testRuns.length === this.expectedTestRunCount &&
      successfulRuns === this.expectedTestRunCount &&
      this.samples.length === expectedSampleCount &&
      this.attachmentParseFailures.length === 0 &&
      this.validationErrors.length === 0;
    this.buildRevision = buildFingerprint.value;
    this.buildFingerprintSource = buildFingerprint.source;
    const buildRevision = this.buildRevision;
    const trackedWorktreeChangesPresent = this.trackedWorktreeChangesPresent;
    const browserVersions = [
      ...new Set(this.samples.map((sample) => sample.browser.version)),
    ];
    const browsers = [
      ...new Set(
        this.samples.map(
          (sample) => `${sample.browser.engine} ${sample.browser.version}`
        )
      ),
    ];
    const throttleRates = [
      ...new Set(
        this.samples
          .map((sample) => sample.cpuThrottleRate)
          .filter((rate): rate is number => rate !== null)
      ),
    ];
    const cpuThrottleRate = throttleRates[0] ?? null;
    const cpuModel = cpus()[0]?.model ?? "unknown";
    const scenarios = summarizeScenarios(this.samples);
    const environment = {
      platform: process.platform,
      architecture: process.arch,
      osRelease: release(),
      nodeVersion: process.version,
      playwrightVersion: getPlaywrightVersion(),
      cpuModel,
      logicalCpuCount: cpus().length,
      totalMemoryBytes: totalmem(),
      browsers,
      browserVersions,
      cpuThrottleRate,
    };
    const report = {
      schemaVersion: 1,
      reportKind: "lab-only-interaction-performance",
      status: passed ? "passed" : "failed-or-incomplete",
      startedAt: this.startedAt,
      generatedAt: new Date().toISOString(),
      buildRevision,
      buildFingerprint: {
        algorithm: "SHA-256",
        value: buildRevision,
        source: this.buildFingerprintSource,
      },
      sourceCheckoutRevision: this.sourceCheckoutRevision,
      buildKind: this.buildKind,
      trackedWorktreeChangesPresent,
      repetitions: this.repetitions,
      testRunCount: this.testRuns.length,
      expectedTestRunCount: this.expectedTestRunCount,
      sampleCount: this.samples.length,
      expectedSampleCount,
      attachmentParseFailureCount: this.attachmentParseFailures.length,
      attachmentParseFailures: this.attachmentParseFailures,
      validationErrors: this.validationErrors,
      environment,
      contentSeed: process.env.PERF_SEED ?? "portfolio-perf-2026",
      contentSeedMethod:
        "Playwright addInitScript seeds Math.random before application modules; this fixes the production Swag shuffle without changing production code.",
      instrumentation: {
        animations:
          "Production animations remain enabled; no reduced-motion override is applied.",
        raf: "Bounded requestAnimationFrame callback interval samples; not actual display FPS.",
        timings:
          "performance.now() elapsed to each recorded first-feedback/content-ready signal; lab-only values, not field INP or real-user latency.",
        longAnimationFrames:
          "Feature-detected PerformanceObserver with bounded entries, captured script attribution fields, and observer/RAF cleanup at phase end.",
        dom: "DOM element/image/video counts sampled every 250ms with a 256-sample per-phase cap.",
        heap: "Chromium CDP Runtime.getHeapUsage samples every 250ms with a 1000-sample cap; short-run trend only, not a leak detector.",
        network:
          "Playwright request/response events plus PerformanceResourceTiming entries captured per phase; response Content-Length and transferSize/encodedBodySize/decodedBodySize reported separately without reading bodies.",
        fixtures:
          "Exact Google Fonts CSS/font and Umami analytics origins are blocked with CDP Network.setBlockedURLs; Playwright routing is not used and Chromium HTTP cache remains enabled. Browser fallback fonts reduce typography/layout realism.",
        cache:
          "Chromium HTTP cache is explicitly enabled with CDP Network.setCacheDisabled(false). Warm video revisit follows an asserted offscreen unload; Resource Timing bytes are reported as cache evidence without assuming a timing threshold.",
        cpuThrottle:
          cpuThrottleRate === null
            ? "Not applied."
            : `${cpuThrottleRate}x CDP CPU throttle; CPU-only scheduling simulation, not a real-device profile.`,
        thresholds:
          "No hard performance timing thresholds are used; interaction behavior assertions gate sample attachment.",
      },
      testRuns: this.testRuns,
      samples: this.samples,
      scenarioSummaries: scenarios,
    };

    const outputDirectory = resolve(process.cwd(), "perf/results");
    mkdirSync(outputDirectory, { recursive: true });
    const timestamp = new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replaceAll(".", "-");
    const jsonPath = resolve(outputDirectory, `report-${timestamp}.json`);
    const latestJsonPath = resolve(outputDirectory, "latest.json");
    const summaryText = renderHumanSummary({
      status: report.status,
      buildRevision,
      buildFingerprintSource: this.buildFingerprintSource,
      sourceCheckoutRevision: this.sourceCheckoutRevision,
      buildKind: this.buildKind,
      trackedWorktreeChangesPresent,
      repetitions: this.repetitions,
      testRunCount: this.testRuns.length,
      expectedTestRunCount: this.expectedTestRunCount,
      sampleCount: this.samples.length,
      expectedSampleCount,
      attachmentParseFailureCount: this.attachmentParseFailures.length,
      validationErrors: this.validationErrors,
      environment,
      scenarios,
    });
    const textPath = resolve(outputDirectory, `summary-${timestamp}.txt`);
    const latestTextPath = resolve(outputDirectory, "latest.txt");

    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(textPath, summaryText);
    writeFileSync(latestTextPath, summaryText);

    process.stdout.write(
      `\n${summaryText}\nJSON report: ${jsonPath}\nText summary: ${textPath}\n`
    );
    return Promise.resolve(passed ? undefined : { status: "failed" });
  }
}
