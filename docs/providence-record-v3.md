# AIDA-Guard Providence chain, record encoding v3

This is the contract between the three implementations of the Guard's
Providence chain: the writer in `@xsoc/providence-log`, the offline verifier
`xsoc-audit-verify --chain guard`, and the independent generator of the
known-answer vectors (`scripts/gen-providence-v3-vectors.py`). The vector file
`guard-providence-v3.json` is checked into both repositories byte for byte, and
each carries a test that fails if the file's SHA-256 differs from the recorded
value, so two implementations that drift cannot both pass.

The construction follows the PQC S3 audit chain (XSOC-S3-ENC-001): a content
digest each record carries forward, a head commitment, and checkpoints
certified in a TPM part under a nonce chained from the previous checkpoint.

## Notation

All integers are big-endian. `lp(b)` is a field: the byte length of `b` as a
u32, then the bytes. A missing field is `lp` of zero bytes. Strings are UTF-8.
`H` is SHA-256.

## 1. The record

A record is one JSON object on one line of `chain-v3.jsonl`. The line carries
exactly the fields below and nothing else. Every key is present; a reader
rejects an unknown key, a missing key, a duplicated key, or a value of the
wrong type.

| Key | JSON type | Content |
|---|---|---|
| `domain` | string | exactly `xsoc-aida-guard:providence-record:v3` |
| `kind` | number | exactly `2`, the Guard record kind |
| `seq` | number | position in the chain, from 0, integer below 2^53 |
| `timestamp_ms` | number | milliseconds since the epoch, integer below 2^53 |
| `event_type` | string | the Guard event type |
| `correlation_id` | string | the request's correlation id, or `""` |
| `device_fingerprint` | string | 64 lowercase hex, or `""` |
| `session_handle` | string | the NIE session handle, 64 lowercase hex, or `""` |
| `payload_digest` | string | 64 lowercase hex, or `""` |
| `subject_id` | string | or `""` |
| `operation_class` | string | or `""` |
| `target_hash` | string | or `""` |
| `classification` | string | or `""` |
| `reason_code` | string | or `""` |
| `payload` | object or null | the typed Guard payload (section 2); null when absent |
| `metadata` | object or null | free-form, section 3; null when absent |
| `prev_digest` | string | 64 lowercase hex: the previous record's digest |

The empty string is the missing value for a string field, and it encodes as a
zero-length field, exactly as an absent field does. `payload` and `metadata`
encode as zero-length fields when null.

A record never keys on a TSTL envelope's identifier or its sealed bytes. Where
a decision concerns a continuity envelope, `payload_digest` is the SHA-256 of
the envelope's canonical readable copy.

### The digest

    digest = H(
        lp("xsoc-aida-guard:providence-record:v3")
        u16(0x0002)
        u64(seq)
        u64(timestamp_ms)
        lp(event_type)
        lp(correlation_id)
        lp(device_fingerprint)
        lp(session_handle)
        lp(payload_digest)
        lp(subject_id)
        lp(operation_class)
        lp(target_hash)
        lp(classification)
        lp(reason_code)
        lp(JCS(payload))       zero-length when payload is null
        lp(JCS(metadata))      zero-length when metadata is null
        prev_digest            32 raw bytes
    )

The domain is encoded exactly as the PQC S3 record encodes its own
(`lp("xsoc-pqc-s3:audit-record:v3")`), so the verifier parses the prefix of both
the same way. The kind follows the domain. A PQC S3 record digest carries no
kind field; its kind, `0x0001`, is implied by its domain.

The digest is not stored in the record. A successor carries it as
`prev_digest`, and the head carries the last one.

**Genesis.** The first record's `prev_digest` is 32 zero bytes, the fixed-width
form of the empty predecessor that marks a PQC S3 chain start.

## 2. The typed payload

`payload` is an object with any of these keys and no others:

| Key | Type |
|---|---|
| `decision_vector` | array of `{"check": string, "result": string}`, in evaluation order |
| `argument_digest` | string, 64 lowercase hex |
| `ancestor_hashes` | array of strings, each 64 lowercase hex |
| `matched_grant_index` | non-negative integer below 2^53 |

## 3. Canonical JSON

`JCS` is RFC 8785, restricted so that every implementation produces the same
bytes without a floating-point formatter:

- Numbers are integers with magnitude below 2^53, written in decimal with no
  exponent, fraction or leading zeros; `-0` is written `0`. A writer refuses any
  other number and a reader rejects it.
- Strings are written as ECMAScript `JSON.stringify` writes them: `"` and `\`
  escaped with a backslash; U+0008, U+0009, U+000A, U+000C and U+000D as `\b`,
  `\t`, `\n`, `\f`, `\r`; every other code point below U+0020 as `\u00xx` with
  lowercase hex; everything else as its UTF-8 bytes. A string that is not
  well-formed Unicode (a lone surrogate) is refused.
- Object members are sorted by their keys compared as sequences of UTF-16 code
  units, with no whitespace anywhere.
- `true`, `false` and `null` as themselves.

## 4. The head

`head-v3.json` holds one object, with exactly these keys:

| Key | Content |
|---|---|
| `chain_id` | `aida-guard/<deployment-id>` |
| `seq` | the next sequence to allocate: one more than the last record's |
| `head_digest` | 64 lowercase hex: the last record's digest, or 32 zero bytes when empty |

    commitment = H(
        lp("xsoc-aida-guard:providence-head:v1")
        u64(seq)
        head_digest            32 raw bytes
        lp(chain_id)
    )

The chain identifier is deployment-scoped, so two deployments never produce
the same commitment for the same content.

**Durability.** A record is appended and fsynced before the head advances. The
head is written to a temporary file, fsynced, and renamed over the old one,
and the rename happens only if the head on disk is still the one the writer
expects. At startup the writer recomputes the last record's digest and refuses
every append if it does not equal the head.

## 5. Anchors

An anchor is a signature over a head commitment, written to `anchors/` as one
object with exactly these keys:

| Key | Content |
|---|---|
| `chain_id`, `head_seq`, `head_digest` | the head the anchor commits to |
| `commitment` | 64 lowercase hex, the head commitment of those three |
| `timestamp_ms` | integer |
| `algorithm` | `ML-DSA-65` or `Ed25519` |
| `key_id` | first 16 lowercase hex of `H(public_key)` |
| `public_key` | base64 of the raw public key |
| `signature` | base64 of the signature |

The signature covers:

    H(
        lp("xsoc-aida-guard:providence-anchor:v1")
        commitment             32 raw bytes
        u64(timestamp_ms)
        lp(algorithm)
        lp(key_id)
        lp(public_key)         raw bytes
    )

signed as a message (ML-DSA-65 with an empty context string; Ed25519 as
specified in RFC 8032). The verifier pins one public key with `--anchor-key`.
An anchor whose algorithm, key or key id differs from the pinned key fails
verification.

## 6. Checkpoints

A checkpoint is `TPM2_Certify` evidence from a pinned part over a head
commitment, produced by `xsoc-boundary`'s `audit_checkpoint` as for the PQC S3
chain. Its nonce chains checkpoints: SHA-256 of the previous checkpoint's
signature bytes, or for the first checkpoint
`H("xsoc-aida-guard:providence-anchor:v1|genesis")`.

## 7. Migration

The v3 chain starts in a new file. The first v3 record's `prev_digest` is
genesis. When the deployment holds a chain in the earlier format, the first v3
record's metadata carries that chain's final head under `legacy_chain_head`, as
a reference only: the earlier format predates this encoding and is not
verified under it.
