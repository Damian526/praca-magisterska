import { Type } from "@sinclair/typebox";

/** Bez scenariusza — ten przychodzi raz, dla całej paczki, żeby ekran aplikacji
 *  nie miał jak podpisać pomiaru złym scenariuszem. */
export const MeasurementInput = Type.Object({
  metric: Type.Union([
    Type.Literal("startup_ms"),
    Type.Literal("ui_response_ms"),
    Type.Literal("api_request_ms"),
    Type.Literal("request_build_ms"),
    Type.Literal("render_checkout_ms"),
    Type.Literal("render_orders_ms"),
    Type.Literal("render_search_ms"),
    Type.Literal("ram_mb"),
    Type.Literal("cpu_percent"),
  ]),
  value: Type.Number({ minimum: 0 }),
  unit: Type.Union([Type.Literal("ms"), Type.Literal("MB"), Type.Literal("%")]),
  serverMs: Type.Optional(Type.Number()),
  /** Epoch ms z urządzenia — bezstrefowy, więc nie da się go przesunąć. */
  recordedAtMs: Type.Integer({ minimum: 0 }),
  extra: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
});

export const MetricsBatchBody = Type.Object({
  sessionId: Type.String({ minLength: 3, maxLength: 32 }),
  runId: Type.String({ minLength: 3, maxLength: 64 }),
  scenario: Type.Union([
    Type.Literal("S1"),
    Type.Literal("S2"),
    Type.Literal("S3"),
  ]),
  platform: Type.Union([Type.Literal("react-native"), Type.Literal("ionic")]),
  deviceModel: Type.String(),
  osVersion: Type.String(),
  buildType: Type.Union([Type.Literal("release"), Type.Literal("debug")]),
  appVersion: Type.String(),
  measurements: Type.Array(MeasurementInput, { minItems: 1, maxItems: 5000 }),
});
