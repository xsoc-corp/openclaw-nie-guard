# XSOC AIDA-Guard: hosted checkpoint evidence, set 1

This set holds two Guard chains from XSOC's hosted AIDA-Guard deployment. Each chain is the record of every decision one Guard made, as the Guard wrote it, and each is tied to a TPM by a checkpoint. You can check all of it yourself, on your own machine, with nothing from XSOC running.

- **The Guards:** the deployment's two MCP Guards, `aida-guard-01-mcp-g1` and `aida-guard-01-mcp-g2`. Each stands in front of the tool servers an agent reaches and decides every `tools/call` against the agent's capability token, with the named checks of XSOC-MCP-DN-001 v1.3.
- **The records:** 31 October 2026, from 19:14 to 20:27 UTC.
- **The anchors:** ML-DSA-65 signatures over each chain's head, the last at 04:15 UTC on 1 November 2026.
- **The checkpoints:** on 1 November 2026 a TPM, an Infineon SLB 9672, certified each chain's head. The chains were frozen after their checkpoints.

## What the records show

| Chain | Records | Decisions |
| --- | --- | --- |
| g1 | 6 | Five calls forwarded, each with all ten checks passed. Then the agent's token was revoked, and its next call was refused at `epoch`: the token named an epoch the Guard no longer held. |
| g2 | 1 | One call refused at `tag_verifies`: the token was minted for another Guard, and this Guard holds no key for that audience. |

Every refusal reached the agent as the same answer, with no detail. The reason is in the record, where a defender can read it.

These Guards ran on stdio, which names no endpoint, so `endpoint_match` does not appear in their decision vectors. On a transport that names the endpoint a call arrived on, it runs after `audience`.

## What is here

| Path | What it is |
| --- | --- |
| `records/g1/`, `records/g2/` | Each chain: `chain-v3.jsonl`, every decision, one record per line, each carrying the digest of the one before it; `head-v3.json`, the chain's head; `anchors/`, the signatures over the chain as it stood. The format is Providence record encoding v3 (`docs/providence-record-v3.md` in the public repository). |
| `g1-anchor-key.json`, `g2-anchor-key.json` | Each Guard's ML-DSA-65 anchor public key: the key every anchor of its chain must verify under. |
| `checkpoints-g1/`, `checkpoints-g2/` | Each chain's checkpoint, `guard-cp-<seq>.json`, signed inside the TPM over the chain's head, with the TPM's endorsement key certificate beside it, `guard-cp-<seq>.ek.der`. |
| `pins/` | The TPM maker's root certificate, Infineon OPTIGA ECC Root CA 2, and the intermediate that issued the part's endorsement key certificate. |
| `verify.json` | The verifier's build and digests, the pins, and each chain's arguments. |
| `runs/verify-g1.txt`, `runs/verify-g2.txt` | The verifier's output on this set, as XSOC ran it. |
| `SHA256SUMS` | The SHA-256 of every file above. |

## Check it

From this folder:

1. **Check the files are whole.**
   - Linux: `sha256sum -c SHA256SUMS`
   - macOS: `shasum -a 256 -c SHA256SUMS`
   - Windows, in PowerShell: `Get-FileHash -Algorithm SHA256 <file>` gives the digest to compare with the file's line in `SHA256SUMS`.
2. **Get the verifier and check it.** The verifier is `xsoc-audit-verify`, build xsoc-pqc-s3-console-api `84a8df3`. Its binaries are files in XSOC AIDA-Guard's Zenodo record, beside their license notice, `LICENSE.txt`: https://doi.org/10.5281/zenodo.19685360. Before you run it, check its SHA-256 against `verify.json`:
   - Linux x86-64, `xsoc-audit-verify`: `8433f7401b3befa0da5b126cc7813c8a226b183827b57cac09e9519f880001c7`
   - Windows x86-64, `xsoc-audit-verify.exe`: `5476682e14274bcfa7b76657018e73d143886f46d1f9ba6f022d5054851e5a3a`
3. **Run it on each chain.** On Linux, for g1:

       ./xsoc-audit-verify --chain guard --records records/g1 --anchor-key g1-anchor-key.json \
         --checkpoints checkpoints-g1 --root pins/optiga-ecc-root-ca2.der --intermediates pins/intermediates \
         --pin-ek 82ffcba105989a69748cf8ab7406d97be0a77d8f71640e0c602c5291762c476b \
         --pin-ak 000b152a26fdbc29614b0c0921b473025d53d1a6199df12e8c165c5e3d408ed75a90

   For g2, put `g2` in place of `g1` in the three paths. On Windows, run `.\xsoc-audit-verify.exe` with the same arguments.
4. **Read the result.** The verifier prints one line per check, then its verdict:
   - **Exit 0, "every check ran and passed":** the chain is whole, its anchors verify under its key, and its checkpoint ties it to the TPM. This is the result for both chains here.
   - **Exit 3, "everything that ran passed, and not everything ran":** a check did not run, and the verifier says which.
   - **Exit 1:** a check failed, and the verifier says which.

`runs/` holds XSOC's own run of these commands, made with a Linux x86-64 build of the same commit, SHA-256 `219f53f1deb987fd814c6516507157c50ebf98e808b03624e36f4d272eb8ef38`. Both chains exit 0.

## What the checks establish

- **Record encoding, linkage and sequencing:** every record is well formed and follows the one before it, so a record removed, reordered or changed shows.
- **The chain ends where the head says:** nothing past the head, nothing missing before it.
- **Each anchor is signed by the pinned key over the chain:** the chain, as each anchor saw it, is the chain you hold.
- **The checkpoint certifies a head of this chain:** the TPM signed the chain's head commitment.
- **The checkpoint's nonce chains from its predecessor:** each is the chain's first checkpoint, so its nonce is the genesis value, the SHA-256 of `xsoc-aida-guard:providence-anchor:v1|genesis`.
- **The checkpoint is signed by the pinned TPM:** the endorsement key certificate chains to the maker's root, its SHA-256 equals `pin_ek`, and the key that signed the checkpoint is the attestation key named by `pin_ak`.

## Where the pins come from

- **The anchor keys** are the copies XSOC keeps for these Guards. Before they were kept, each was checked against every anchor in its chain: g1's key `89fa054a8208a008` signs all 15 of g1's anchors, and g2's key `f9bc8d4b1e723cdb` all 10 of g2's. A key read from the chain under test would not be a pin.
- **`pin_ek`** is the SHA-256 of the part's endorsement key certificate.
- **`pin_ak`** is the name of the attestation key. Before any checkpoint was made, XSOC proved the key resident in this part by credential activation, and a credential bound to another key was refused. The pin comes from that proof, not from the checkpoints.

## Nothing here is a secret or an operator token

Every file in this set was checked before publication:
- The records, the anchors, the keys and the checkpoints carry digests, public keys, signatures and public TPM structures only.
- Each anchor key is an ML-DSA-65 public key, 1952 bytes. The certificates are public certificates.
- No string in any file is one of the deployment's operator tokens.
- No record carries a session handle.

XSOC Corp. XSOC's approved-algorithm cryptography runs through AWS-LC in FIPS-approved mode today, and the XSOC cryptographic module is in CMVP validation with Leidos.
