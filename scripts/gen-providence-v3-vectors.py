#!/usr/bin/env python3
"""Generate the known-answer vectors for the AIDA-Guard Providence chain, v3.

An independent implementation of docs/providence-record-v3.md, sharing no code
with the TypeScript writer or the Rust verifier. Its output,
guard-providence-v3.json, is checked into both repositories byte for byte; the
writer's and the verifier's tests recompute every value in it and fail on any
difference.

    python3 scripts/gen-providence-v3-vectors.py > guard-providence-v3.json

Needs the `cryptography` package for the Ed25519 anchor vector.
"""

import base64
import hashlib
import json
import struct
import sys

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

RECORD_DOMAIN = b"xsoc-aida-guard:providence-record:v3"
S3_RECORD_DOMAIN = b"xsoc-pqc-s3:audit-record:v3"
HEAD_DOMAIN = b"xsoc-aida-guard:providence-head:v1"
ANCHOR_DOMAIN = b"xsoc-aida-guard:providence-anchor:v1"
GUARD_KIND = 0x0002
GENESIS = bytes(32)
MAX_SAFE = 2**53 - 1

STRING_FIELDS = [
    "event_type",
    "correlation_id",
    "device_fingerprint",
    "session_handle",
    "payload_digest",
    "subject_id",
    "operation_class",
    "target_hash",
    "classification",
    "reason_code",
]


def lp(b: bytes) -> bytes:
    return struct.pack(">I", len(b)) + b


def jcs_string(s: str) -> str:
    out = ['"']
    for ch in s:
        o = ord(ch)
        if 0xD800 <= o <= 0xDFFF:
            raise ValueError("lone surrogate")
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif o == 0x08:
            out.append("\\b")
        elif o == 0x09:
            out.append("\\t")
        elif o == 0x0A:
            out.append("\\n")
        elif o == 0x0C:
            out.append("\\f")
        elif o == 0x0D:
            out.append("\\r")
        elif o < 0x20:
            out.append("\\u%04x" % o)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def utf16_key(k: str):
    return k.encode("utf-16-be")


def jcs(v) -> str:
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, int):
        if abs(v) > MAX_SAFE:
            raise ValueError("integer out of range")
        return str(v)
    if isinstance(v, float):
        raise ValueError("non-integer number")
    if isinstance(v, str):
        return jcs_string(v)
    if isinstance(v, list):
        return "[" + ",".join(jcs(x) for x in v) + "]"
    if isinstance(v, dict):
        keys = sorted(v.keys(), key=utf16_key)
        return "{" + ",".join(jcs_string(k) + ":" + jcs(v[k]) for k in keys) + "}"
    raise ValueError("unsupported type")


def blob(v) -> bytes:
    return b"" if v is None else jcs(v).encode("utf-8")


def record_digest(rec: dict, domain: bytes = RECORD_DOMAIN) -> bytes:
    h = hashlib.sha256()
    h.update(lp(domain))
    h.update(struct.pack(">H", GUARD_KIND))
    h.update(struct.pack(">Q", rec["seq"]))
    h.update(struct.pack(">Q", rec["timestamp_ms"]))
    for f in STRING_FIELDS:
        h.update(lp(rec[f].encode("utf-8")))
    h.update(lp(blob(rec["payload"])))
    h.update(lp(blob(rec["metadata"])))
    h.update(bytes.fromhex(rec["prev_digest"]))
    return h.digest()


def head_commitment(seq: int, head_digest: bytes, chain_id: str) -> bytes:
    h = hashlib.sha256()
    h.update(lp(HEAD_DOMAIN))
    h.update(struct.pack(">Q", seq))
    h.update(head_digest)
    h.update(lp(chain_id.encode("utf-8")))
    return h.digest()


def anchor_message(commitment: bytes, timestamp_ms: int, algorithm: str, key_id: str, public_key: bytes) -> bytes:
    h = hashlib.sha256()
    h.update(lp(ANCHOR_DOMAIN))
    h.update(commitment)
    h.update(struct.pack(">Q", timestamp_ms))
    h.update(lp(algorithm.encode("utf-8")))
    h.update(lp(key_id.encode("utf-8")))
    h.update(lp(public_key))
    return h.digest()


def base_record(seq: int, ts: int, prev: bytes) -> dict:
    r = {"domain": RECORD_DOMAIN.decode(), "kind": GUARD_KIND, "seq": seq, "timestamp_ms": ts}
    for f in STRING_FIELDS:
        r[f] = ""
    r["payload"] = None
    r["metadata"] = None
    r["prev_digest"] = prev.hex()
    return r


def main() -> None:
    chain_id = "aida-guard/vector-test"
    records = []

    r0 = base_record(0, 1791489600000, GENESIS)
    r0["event_type"] = "admit"
    r0["correlation_id"] = "00000000-0000-4000-8000-000000000001"
    r0["device_fingerprint"] = "d1" * 32
    r0["session_handle"] = "5e" * 32
    r0["subject_id"] = "user-vector"
    r0["metadata"] = {"legacy_chain_head": "ab" * 32}
    records.append(r0)

    d0 = record_digest(r0)
    r1 = base_record(1, 1791489600123, d0)
    r1["event_type"] = "envelope_rejected"
    r1["correlation_id"] = "00000000-0000-4000-8000-000000000002"
    r1["device_fingerprint"] = "d1" * 32
    r1["session_handle"] = "5e" * 32
    r1["payload_digest"] = "c0" * 32
    r1["operation_class"] = "tool.invoke"
    r1["reason_code"] = "ERR_SESSION_EXPIRED"
    r1["metadata"] = {"reason_class": "expired", "stage": "envelope"}
    records.append(r1)

    d1 = record_digest(r1)
    r2 = base_record(2, 1791489601000, d1)
    r2["event_type"] = "invoke"
    r2["correlation_id"] = "00000000-0000-4000-8000-000000000003"
    r2["device_fingerprint"] = "d1" * 32
    r2["session_handle"] = "5e" * 32
    r2["payload_digest"] = "c1" * 32
    r2["subject_id"] = "user-vector"
    r2["operation_class"] = "file.read"
    r2["target_hash"] = "7a" * 32
    r2["classification"] = "sensitive"
    r2["payload"] = {
        "decision_vector": [
            {"check": "AudienceMatch", "result": "pass"},
            {"check": "PathWithin", "result": "pass"},
        ],
        "argument_digest": "a9" * 32,
        "ancestor_hashes": ["e1" * 32, "e2" * 32],
        "matched_grant_index": 0,
    }
    # Exercises the canonical form: key order by UTF-16 code units (the
    # supplementary-plane key sorts before U+FF61 there, after it by code
    # point), escapes, a control character, non-ASCII, nesting, integers.
    r2["metadata"] = {
        "｡": "halfwidth",
        "\U0001f600": "smile",
        "b": [1, -2, 0, True, False, None],
        "a": {"z": "quote\" backslash\\ tab\t nl\n cr\r bs\b ff\f nul\u0000 us\u001f", "y": "café  "},
        "B": 9007199254740991,
    }
    records.append(r2)

    digests = [record_digest(r) for r in records]
    head = {"chain_id": chain_id, "seq": len(records), "head_digest": digests[-1].hex()}
    commitment = head_commitment(head["seq"], digests[-1], chain_id)
    empty_commitment = head_commitment(0, GENESIS, chain_id)

    seed = hashlib.sha256(b"guard-providence-v3 test vector ed25519 seed").digest()
    sk = Ed25519PrivateKey.from_private_bytes(seed)
    pk = sk.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    key_id = hashlib.sha256(pk).hexdigest()[:16]
    anchor_ts = 1791489602000
    msg = anchor_message(commitment, anchor_ts, "Ed25519", key_id, pk)
    sig = sk.sign(msg)
    anchor = {
        "chain_id": chain_id,
        "head_seq": head["seq"],
        "head_digest": head["head_digest"],
        "commitment": commitment.hex(),
        "timestamp_ms": anchor_ts,
        "algorithm": "Ed25519",
        "key_id": key_id,
        "public_key": base64.b64encode(pk).decode(),
        "signature": base64.b64encode(sig).decode(),
    }

    jcs_cases = [
        {"value": r2["metadata"], "jcs": jcs(r2["metadata"])},
        {"value": r2["payload"], "jcs": jcs(r2["payload"])},
        {"value": {}, "jcs": "{}"},
        {"value": [], "jcs": "[]"},
    ]

    out = {
        "spec": "docs/providence-record-v3.md",
        "record_domain": RECORD_DOMAIN.decode(),
        "head_domain": HEAD_DOMAIN.decode(),
        "anchor_domain": ANCHOR_DOMAIN.decode(),
        "kind": GUARD_KIND,
        "genesis_prev_digest": GENESIS.hex(),
        "records": records,
        "record_digests": [d.hex() for d in digests],
        "record_lines": [json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in records],
        "head": head,
        "head_commitment": commitment.hex(),
        "empty_head_commitment": empty_commitment.hex(),
        "cross_domain": {
            "note": "record 0's fields hashed under the PQC S3 record domain; must differ from record_digests[0]",
            "digest_under_s3_domain": record_digest(r0, S3_RECORD_DOMAIN).hex(),
        },
        "anchor": anchor,
        "anchor_message": msg.hex(),
        "anchor_ed25519_seed": seed.hex(),
        "checkpoint_genesis_nonce": hashlib.sha256(ANCHOR_DOMAIN + b"|genesis").hexdigest(),
        "jcs": jcs_cases,
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
