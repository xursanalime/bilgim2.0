import type { Env } from '../config/env.provider';

/**
 * OpenTelemetry tracing bazasi (§9).
 * OTEL_EXPORTER_OTLP_ENDPOINT berilmagan bo'lsa hech narsa ulanmaydi —
 * lokal dev'da zero-overhead. Trace'larga requestId/schoolId keyingi
 * fazalarda qo'shiladi; password/token/message body logga yozilmaydi.
 */
export async function setupTracing(env: Env): Promise<(() => Promise<void>) | undefined> {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return undefined;
  }

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import(
    '@opentelemetry/auto-instrumentations-node'
  );
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

  const sdk = new NodeSDK({
    serviceName: 'bilgim-api',
    traceExporter: new OTLPTraceExporter({ url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  return async () => {
    await sdk.shutdown();
  };
}
