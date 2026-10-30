import type { FastifyInstance } from 'fastify';
import type { FheGate } from '@xsoc/fhe-gate';
import type { NieBindings } from '@xsoc/nie-bindings';

type KnownDevicePreflight = Awaited<ReturnType<NonNullable<NieBindings['preflightKnownDevices']>>>[number];
import type { OperatorAuth } from '../lib/operator-auth.js';

/**
 * GET /v1/preflight: the broker's dependencies, read-only, for the deployment's
 * pre-flight. Operators only, as /v1/audit.
 *
 * It reports the FHE gate's pre-flight (a fresh endpoint attestation, which for the
 * production gate is a reauth of its NIE device, and the FHE service's health check),
 * a fresh reauth of each known device the bindings hold (nie.knownDevices: scene 1's
 * agents, by label; empty where the bindings hold none), and whether the chain
 * accepts appends. It decides nothing, admits nothing and appends nothing.
 */
export async function registerPreflightRoute(app: FastifyInstance, auth: OperatorAuth): Promise<void> {
  app.get('/v1/preflight', { preHandler: auth.preHandler() }, async () => {
    const fheGate: FheGate = app.services.fheGate;
    const log = app.services.providence.log;
    let fhe;
    try {
      fhe = await fheGate.preflight();
    } catch (err) {
      const error = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      fhe = { device: { ok: false, error }, service: { ok: false, error } };
    }
    const bindings = app.services.bindings;
    let nie: { knownDevices: KnownDevicePreflight[]; error?: string };
    try {
      nie = { knownDevices: bindings.preflightKnownDevices ? await bindings.preflightKnownDevices() : [] };
    } catch (err) {
      nie = { knownDevices: [], error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
    }
    const head = log.getHead();
    return { chain: { chainId: log.chainId, seq: head.seq, refusal: log.refusal ?? null }, fhe, nie };
  });
}
