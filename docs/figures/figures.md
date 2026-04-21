# Architecture Figures

*Referenced in the Zenodo paper v1.0. Mermaid source renders natively on
GitHub and most modern markdown viewers. PNG exports for PDF embedding are
in this directory with the same basename.*

---

## Figure 1. Five-plane architecture of XSOC-NIE-GUARD

Described in Section 3.2. Every operation from the agent framework flows
through the mediation layer via the single front door at /v1/admit and
/v1/invoke. No bypass path reaches OpenClaw directly.

```mermaid
graph TD
    Client[Client Device<br/>enrolled subject]

    subgraph P1["P1 Client Trust Plane"]
        AttGen[Device Attestation<br/>attestation floor check]
    end

    subgraph P2["P2 Admission Plane"]
        Admit["/v1/admit<br/>role authorization<br/>capability issuance"]
    end

    subgraph P3["P3 Action Mediation Plane"]
        Invoke["/v1/invoke<br/>5 checks in sequence"]
        FHE[A1 FHE Context Gate]
        MCP[A3 MCP Boundary Mediation]
    end

    subgraph P4["P4 Runtime Continuity Plane"]
        TSTL[TSTL Envelope<br/>device + session + target binding]
        CPC[A4 Context Provenance Chain]
        AIE[A2 Agent Intent Envelope]
    end

    subgraph P5["P5 Audit and Revocation Plane"]
        Prov[Providence Hash Chain<br/>tamper-evident audit]
        Rev[Three-tier Revocation<br/>cache + Redis + fanout]
    end

    OpenClaw[OpenClaw / Agent Framework<br/>untrusted]
    ModelVendor[Model Vendor API<br/>honest-but-curious]

    Client --> AttGen
    AttGen --> Admit
    Admit --> Invoke
    Invoke --> TSTL
    Invoke --> CPC
    Invoke --> AIE
    Invoke --> FHE
    Invoke --> MCP
    TSTL --> Prov
    CPC --> Prov
    AIE --> Prov
    FHE --> Prov
    Invoke --> OpenClaw
    FHE -.ciphertext only.-> ModelVendor
    Admit --> Prov
    Rev -.revocation fanout.-> Invoke

    style FHE fill:#e3f0ff,stroke:#1d5fb4,stroke-width:2px
    style OpenClaw fill:#ffeeee,stroke:#c00
    style ModelVendor fill:#ffeeee,stroke:#c00
```

---

## Figure 2. FHE Context Gate three-mode decision flow

Described in Section 6.5. The gate is a deterministic function of operation
inputs and policy state. Every denial returns a structured reason code and
emits a Providence event.

```mermaid
flowchart TD
    Start([GateInput:<br/>elements, requestedMode,<br/>classification, endpoint_att,<br/>dual_control_receipt])
    Compat{requestedMode in<br/>MODE_COMPATIBILITY<br/>of classification?}
    Deny1[deny ERR_CLASSIFICATION_VIOLATION]
    ModeCheck{requestedMode == ?}
    ModeA([Mode A<br/>Full FHE<br/>ciphertext end-to-end])
    ModeB([Mode B<br/>Tokenized substitution<br/>opaque tokens to model])
    AttCheck{endpoint attestation<br/>identifier present?}
    Deny2[deny ERR_ENDPOINT_ATTESTATION_FAILED]
    ClassCheck{classification ==<br/>classified-adjacent?}
    Deny3[deny ERR_MODE_C_UNAUTHORIZED]
    DualCheck{classification == regulated<br/>AND dual control receipt missing?}
    Deny4[deny ERR_DUAL_CONTROL_REQUIRED]
    ModeC([Mode C<br/>Attested cleartext<br/>Providence-logged release])

    Start --> Compat
    Compat -->|no| Deny1
    Compat -->|yes| ModeCheck
    ModeCheck -->|A| ModeA
    ModeCheck -->|B| ModeB
    ModeCheck -->|C| AttCheck
    AttCheck -->|missing| Deny2
    AttCheck -->|present| ClassCheck
    ClassCheck -->|yes| Deny3
    ClassCheck -->|no| DualCheck
    DualCheck -->|yes| Deny4
    DualCheck -->|no| ModeC

    style ModeA fill:#e3f0ff,stroke:#1d5fb4,stroke-width:2px
    style ModeB fill:#fff8e1,stroke:#b88000,stroke-width:2px
    style ModeC fill:#ffebee,stroke:#c00,stroke-width:2px
    style Deny1 fill:#f5f5f5,stroke:#666
    style Deny2 fill:#f5f5f5,stroke:#666
    style Deny3 fill:#f5f5f5,stroke:#666
    style Deny4 fill:#f5f5f5,stroke:#666
```

---

## Figure 3. Capability Derivation Tree

Described in Section 4.4. Children are strictly narrower than parents;
widening is not a permitted operation. Revocation cascades from parent to
all descendants in sub-millisecond time.

```mermaid
graph TD
    Admission["Admission Capability<br/>role: operator<br/>ops: tool.invoke + file.read + file.write<br/>TTL: 15 min"]

    C1["Child 1<br/>ops: tool.invoke<br/>TTL: 5 min<br/>(narrowing: operations)"]
    C2["Child 2<br/>ops: file.read<br/>TTL: 3 min<br/>(narrowing: operations + TTL)"]
    C3["Child 3<br/>ops: file.write<br/>target: /tmp/work<br/>TTL: 2 min<br/>(narrowing: operations + target + TTL)"]

    GC1["Grandchild 1.1<br/>ops: tool.invoke<br/>target: target-A<br/>TTL: 1 min"]

    Forbidden["NOT PERMITTED<br/>C1 cannot derive child with file.read<br/>C2 cannot derive child with exec.run<br/>GC1 cannot derive child with TTL &gt; 1 min"]

    Admission -->|deriveScopedCapability| C1
    Admission -->|deriveScopedCapability| C2
    Admission -->|deriveScopedCapability| C3
    C1 -->|deriveScopedCapability| GC1

    Revoke["Revoke C1<br/>cascade to GC1<br/>sub-millisecond"]
    C1 -.->|cascades| Revoke
    GC1 -.->|invalidated| Revoke

    style Admission fill:#e3f0ff,stroke:#1d5fb4,stroke-width:2px
    style Forbidden fill:#fffbe6,stroke:#c00,stroke-width:2px
    style Revoke fill:#ffebee,stroke:#c00
```

---

## Figure 4. Providence hash chain structure

Described in Section 10.2. Each event carries a hash of the preceding
event's hash. Truncation is detectable; external anchoring of the head
hash at periodic intervals closes the remaining gap.

```mermaid
graph LR
    Genesis["Genesis<br/>prev_hash:<br/>000...000<br/>(64 zeros)"]

    E1["Event 1<br/>type: admit<br/>prev: Genesis<br/>eventHash: H1"]
    E2["Event 2<br/>type: invoke<br/>prev: H1<br/>eventHash: H2"]
    E3["Event 3<br/>type: intent_drift<br/>prev: H2<br/>eventHash: H3<br/>reason: ERR_INTENT_DRIFT"]
    E4["Event 4<br/>type: revoke<br/>prev: H3<br/>eventHash: H4"]
    E5["Event 5<br/>type: bundle_rotation<br/>prev: H4<br/>eventHash: H5"]

    Anchor["External Anchor<br/>periodic publication of head hash<br/>to tamper-evident store"]

    Audit["Auditor Verification<br/>recompute each eventHash<br/>verify prev chain<br/>verify head matches anchor"]

    Genesis --> E1
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 -.every N events.-> Anchor
    Anchor -.verify.-> Audit
    E5 -.verify.-> Audit

    style Genesis fill:#f5f5f5,stroke:#333
    style E3 fill:#ffebee,stroke:#c00
    style Anchor fill:#e3f0ff,stroke:#1d5fb4
    style Audit fill:#f0f9f0,stroke:#2a7a2a
```

---

## Figure source files

All four figures are maintained as Mermaid source in this document. To
regenerate PNG or SVG exports for PDF embedding, use the `mmdc` command
line tool from the mermaid-cli npm package:

```bash
npm install -g @mermaid-js/mermaid-cli
# Then from the repo root:
mmdc -i docs/figures/figures.md -o docs/figures/figure-exports/
```

The rendered PDF of the Zenodo paper includes these figures via
fenced code block rendering in Pandoc with the mermaid filter, or as
pre-rendered PNG imports where the filter is unavailable.
