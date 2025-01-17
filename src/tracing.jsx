import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { Resource, browserDetector } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { detectResourcesSync } from '@opentelemetry/resources/build/src/detect-resources';
import { ZoneContextManager } from '@opentelemetry/context-zone';

const FrontendTracer = () => {
  let resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: import.meta.env.REACT_APP_NAME
  });

  const detectedResources = detectResourcesSync({ detectors: [browserDetector] });
  resource = resource.merge(detectedResources);
  const provider = new WebTracerProvider({ resource });

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
      }),
      {
        scheduledDelayMillis: 500,
      }
    )
  );

  provider.register({
    contextManager : new ZoneContextManager(),
    propagator: new CompositePropagator({
      propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()],
    }),
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute("app.synthetic_request", false);
          }
        },
      }),
    ],
  });
};

export default FrontendTracer;