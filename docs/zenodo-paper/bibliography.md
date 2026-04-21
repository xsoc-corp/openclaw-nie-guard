# XSOC-NIE-GUARD Zenodo paper bibliography

Numbered reference list, final form for v1.0 Zenodo upload. Match Franklin et
al. style for compatibility. All XSOC-specific citations use exact forms from
the disclosure policy (see `docs/disclosure-policy.md`).

---

**[1]** Franklin, M., Tomašev, N., Jacobs, J., Leibo, J. Z., and Osindero, S.
AI Agent Traps. Google DeepMind. SSRN preprint 6372438, 2026.

**[2]** Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., and Fritz, M.
Not what you've signed up for: Compromising Real-World LLM-integrated
Applications with Indirect Prompt Injection. arXiv:2302.12173, 2023.

**[3]** Willison, S. The lethal trifecta for AI agents: private data,
untrusted content, and external communication. simonwillison.net, June 2025.

**[4]** Shapira, A., Gandhi, P. A., Habler, E., and Shabtai, A. Mind the web:
The security of web use agents. arXiv:2506.07153, 2025.

**[5]** Triedman, H., Jha, R., and Shmatikov, V. Multi-agent systems execute
arbitrary malicious code. arXiv:2503.12188, 2025.

**[6]** Zou, W., Geng, R., Wang, B., and Jia, J. PoisonedRAG: Knowledge
corruption attacks to retrieval-augmented generation of large language
models. In 34th USENIX Security Symposium (USENIX Security 25),
pp. 3827-3844, 2025.

**[7]** Qi, X., Huang, K., Panda, A., Henderson, P., Wang, M., and Mittal, P.
Visual adversarial examples jailbreak aligned large language models.
In Proceedings of the AAAI Conference on Artificial Intelligence,
volume 38, pp. 21527-21536, 2024.

**[8]** Evtimov, I., Zharmagambetov, A., Grattafiori, A., Guo, C., and Chaudhuri, K.
WASP: Benchmarking web agent security against prompt injection attacks.
arXiv:2504.18575, 2025.

**[9]** Zhan, Q., Liang, Z., Ying, Z., and Kang, D. InjecAgent: Benchmarking
indirect prompt injections in tool-integrated large language model agents.
In Findings of the Association for Computational Linguistics: ACL 2024,
pp. 10471-10506, 2024.

**[10]** Chen, Z., Xiang, Z., Xiao, C., Song, D., and Li, B. AgentPoison:
Red-teaming LLM agents via poisoning memory or knowledge bases.
In Advances in Neural Information Processing Systems 37,
pp. 130185-130213, 2024.

**[11]** Tomasev, N., Franklin, M., Leibo, J. Z., Jacobs, J., Cunningham, W. A.,
Gabriel, I., and Osindero, S. Virtual agent economies. arXiv:2509.10147, 2025.

**[12]** Cohen, S., Bitton, R., and Nassi, B. Here comes the AI worm:
Unleashing zero-click worms that target GenAI-powered applications.
arXiv:2403.02817, 2024.

**[13]** Anthropic. System card: Claude Opus 4 and Claude Sonnet 4. Claude-4
model card, 2025.

---

## Cryptographic and XSOC-adjacent references

**[14]** National Institute of Standards and Technology. FIPS PUB 203:
Module-Lattice-Based Key-Encapsulation Mechanism Standard. August 2024.
(ML-KEM reference; underlies the post-quantum admission path in XSOC-NIE-GUARD.)

**[15]** Cheon, J. H., Kim, A., Kim, M., and Song, Y. Homomorphic encryption
for arithmetic of approximate numbers. In Advances in Cryptology -
ASIACRYPT 2017, pp. 409-437, 2017. (CKKS foundational paper.)

---

## XSOC external validations (authoritative forms per disclosure policy)

**[16]** Perrin, L., and Biryukov, A. Confidential cryptographic audits of the
legacy XSOC cryptosystem. University of Luxembourg, 2020 and 2024. Audits
predate the creation of DSKAG. Mandatory findings from both audits were
incorporated into the current canonical build (SP-VERSA Canonical Build 2025-10).

**[17]** Faculty Cryptography Laboratory, Department of Computer Science,
California Polytechnic State University, San Luis Obispo. Dieharder v3.31.1
statistical validation of the XSOC entropy subsystem. 50 test batches each
exceeding 64 Mbits of output from the canonical XSOC RNG via
generateInitialKeyVector(). 98 tests total across Diehard, NIST SP 800-22 STS,
RGB, and DAB test matrices: 97 passed, 1 weak, 0 failed. Aggregate 99.4 percent
pass rate. Reference dataset: XSOC Dieharder Output 20220104A, available under
controlled access.

**[18]** George Mason University SENTINEL laboratory. Audit of the XSOC
cryptographic stack, finding reference FP5223. Full public report scheduled
for publication in June 2026.

**[19]** XSOC Corp. XSOC Cryptosystem Executive Validation Report, SP-VERSA
Canonical Build 2025-10, Independent Validation and Design Description
(Post-Audit Edition). Confidential, available under NDA. 2025. (Section 3
Mathematical Foundations and Appendix F Cryptographic Parameters and
Methodology require a separate NDA distinct from the general technical NDA
and are subject to export control.)

---

## Compliance and governance references

**[20]** National Institute of Standards and Technology. AI Risk Management
Framework (AI RMF 1.0). NIST AI 100-1, January 2023.

**[21]** OWASP. Top 10 for LLM and Generative AI Applications, Agentic AI
extension. 2026 update.

**[22]** International Organization for Standardization. ISO/IEC 42001:2023
Information technology - Artificial intelligence - Management system.

**[23]** European Parliament and Council. Regulation (EU) 2024/1689 on
harmonised rules on artificial intelligence (AI Act). Official Journal of the
European Union, July 2024.

**[24]** National Institute of Standards and Technology. NIST SP 800-90B
Recommendation for the Entropy Sources Used for Random Bit Generation, 2018.

**[25]** National Institute of Standards and Technology. NIST SP 800-208
Recommendation for Stateful Hash-Based Signature Schemes, 2020.

**[26]** European Telecommunications Standards Institute. ETSI GR QSC 001
Quantum-Safe Cryptography.

**[27]** National Security Agency. Commercial National Security Algorithm
Suite 2.0 (CNSA 2.0), 2022.

**[28]** FIPS 140-3 / ISO 19790. Security Requirements for Cryptographic
Modules. Referenced throughout via BouncyCastle BC-FIPS 2.1.2 validated
module, NIST CMVP Certificate 4943.

---

## OpenClaw public record primary sources

**[29]** Censys. OpenClaw exposure analysis: 135,000+ internet-facing
instances. Public analysis, Q1 2026.

**[30]** Koi Security. ClawHub marketplace audit: 341 malicious skills
identified across 2,857 audited. ClawHavoc campaign analysis. Public
research report, 2026.

**[31]** Hudson Rock. Infostealer targeting of OpenClaw credential files.
Public threat advisory, 2026.

**[32]** National Vulnerability Database. CVE-2026-33579: OpenClaw pairing
privilege escalation.

**[33]** National Vulnerability Database. CVE-2026-32922: OpenClaw critical
privilege escalation.

**[34]** Palo Alto Networks Unit 42. OpenClaw failure modes mapped to OWASP
Top 10 for Agentic Applications. Public research, 2026.

---

## Memory, retrieval, and multi-agent risk

**[35]** Wang, B., He, W., Zeng, S., Xiang, Z., Xing, Y., Tang, J., and He, P.
Unveiling privacy risks in LLM agent memory. In Proceedings of the 63rd Annual
Meeting of the Association for Computational Linguistics (Volume 1: Long
Papers), pp. 25241-25260, 2025.

**[36]** Dong, S., Xu, S., He, P., Li, Y., Tang, J., Liu, T., Liu, H., and Xiang, Z.
A practical memory injection attack against LLM agents. arXiv:2503.03704, 2025.

**[37]** Hammond, L., Chan, A., Clifton, J., Hoelscher-Obermaier, J.,
Khan, A., McLean, E., Smith, C., Barfuss, W., Foerster, J., Gavenčiak, T.,
et al. Multi-agent risks from advanced AI. arXiv:2502.14143, 2025.

---

## Additional jailbreak and prompt injection literature

**[38]** Bagdasaryan, E., Hsieh, T.-Y., Nassi, B., and Shmatikov, V. Abusing
images and sounds for indirect instruction injection in multi-modal LLMs.
arXiv:2307.10490, 2023.

**[39]** Shen, X., Chen, Z., Backes, M., Shen, Y., and Zhang, Y. "Do Anything
Now": Characterizing and evaluating in-the-wild jailbreak prompts on large
language models. In Proceedings of the 2024 ACM SIGSAC Conference on Computer
and Communications Security, pp. 1671-1685, 2024.

**[40]** Hardy, N. The confused deputy: (or why capabilities might have been
invented). ACM SIGOPS Operating Systems Review 22(4):36-38, 1988.

---

## XSOC prior publications (authoritative Zenodo chain)

**[41]** Blech, R. XSOC-QSIG (DSKAG-IT-SIG). Zenodo preprint,
DOI 10.5281/zenodo.19639166, 2025.

---

## Bibliography notes

Entries [16] through [19] constitute the authoritative form for citing XSOC
external validations in any public XSOC deliverable. Any deviation from these
forms requires explicit approval per the disclosure policy.

Entry [41] is Richard Blech's most recent XSOC QSIG publication on Zenodo and
is the canonical public anchor for the XSOC cryptographic stack. Any prior
Zenodo identifiers in draft materials are superseded by this DOI.
