import { Type } from "@sinclair/typebox";

export const MeasurementInput = Type.Object({
  scenario: Type.Union([
    Type.Literal("S1"),
    Type.Literal("S2"),
    Type.Literal("S3"),
  ]),
  metric: Type.Union([
    Type.Literal("startup_ms"),
    Type.Literal("ui_response_ms"),
    Type.Literal("api_request_ms"),
    Type.Literal("render_ms"),
    Type.Literal("ram_mb"),
    Type.Literal("cpu_percent"),
  ]),
  iteration: Type.Integer({ minimum: 1 }),
  value: Type.Number({ minimum: 0 }),
  unit: Type.Union([Type.Literal("ms"), Type.Literal("MB"), Type.Literal("%")]),
  serverMs: Type.Optional(Type.Number()),
  recordedAt: Type.String({ format: "date-time" }),
  extra: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
});

export const MetricsBatchBody = Type.Object({
  runId: Type.String({ minLength: 3, maxLength: 64 }),
  platform: Type.Union([Type.Literal("react-native"), Type.Literal("ionic")]),
  deviceModel: Type.String(),
  osVersion: Type.String(),
  buildType: Type.Union([Type.Literal("release"), Type.Literal("debug")]),
  appVersion: Type.String(),
  measurements: Type.Array(MeasurementInput, { minItems: 1, maxItems: 5000 }),
});
