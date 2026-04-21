% XSOC-NIE-GUARD Zenodo paper bibliography
% Format: numbered reference list. Match Franklin et al. style for compatibility.
% All entries verified or marked [TO VERIFY] where the paper cites from memory.

[1] Franklin, M., Tomašev, N., Jacobs, J., Leibo, J. Z., and Osindero, S.
    AI Agent Traps. Google DeepMind. SSRN preprint 6372438, 2026.

[2] Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., and Fritz, M.
    Not what you've signed up for: Compromising Real-World LLM-integrated
    Applications with Indirect Prompt Injection. arXiv:2302.12173, 2023.

[3] Willison, S. The lethal trifecta for AI agents: private data, untrusted
    content, and external communication. simonwillison.net, June 2025.
    [Blog post; widely cited in the 2026 agent security literature including
    Franklin et al. 2026 and Palo Alto Networks OpenClaw analysis.]

[4] Shapira, A., Gandhi, P. A., Habler, E., and Shabtai, A. Mind the web:
    The security of web use agents. arXiv:2506.07153, 2025.

[5] Triedman, H., Jha, R., and Shmatikov, V. Multi-agent systems execute
    arbitrary malicious code. arXiv:2503.12188, 2025.

[6] Zou, W., Geng, R., Wang, B., and Jia, J. PoisonedRAG: Knowledge corruption
    attacks to retrieval-augmented generation of large language models.
    In 34th USENIX Security Symposium (USENIX Security 25), pp. 3827-3844, 2025.

[7] Qi, X., Huang, K., Panda, A., Henderson, P., Wang, M., and Mittal, P.
    Visual adversarial examples jailbreak aligned large language models.
    In Proceedings of the AAAI Conference on Artificial Intelligence,
    volume 38, pp. 21527-21536, 2024.

[8] Evtimov, I., Zharmagambetov, A., Grattafiori, A., Guo, C., and Chaudhuri, K.
    WASP: Benchmarking web agent security against prompt injection attacks.
    arXiv:2504.18575, 2025.

[9] Zhan, Q., Liang, Z., Ying, Z., and Kang, D. InjecAgent: Benchmarking
    indirect prompt injections in tool-integrated large language model agents.
    In Findings of the Association for Computational Linguistics: ACL 2024,
    pp. 10471-10506, 2024.

[10] Chen, Z., Xiang, Z., Xiao, C., Song, D., and Li, B. AgentPoison:
     Red-teaming LLM agents via poisoning memory or knowledge bases.
     In Advances in Neural Information Processing Systems 37,
     pp. 130185-130213, 2024.

[11] Tomasev, N., Franklin, M., Leibo, J. Z., Jacobs, J., Cunningham, W. A.,
     Gabriel, I., and Osindero, S. Virtual agent economies. arXiv:2509.10147, 2025.

[12] Cohen, S., Bitton, R., and Nassi, B. Here comes the AI worm: Unleashing
     zero-click worms that target GenAI-powered applications.
     arXiv:2403.02817, 2024.

[13] Anthropic. System card: Claude Opus 4 and Claude Sonnet 4. Claude-4 model
     card, 2025.

% Cryptographic and XSOC-adjacent references

[14] National Institute of Standards and Technology. FIPS PUB 203: Module-Lattice-Based
     Key-Encapsulation Mechanism Standard. August 2024.
     [ML-KEM reference; underlies NIE post-quantum admission path.]

[15] Cheon, J. H., Kim, A., Kim, M., and Song, Y. Homomorphic encryption for
     arithmetic of approximate numbers. In Advances in Cryptology - ASIACRYPT 2017,
     pp. 409-437, 2017. [CKKS foundational paper.]

[16] Biryukov, A., and Perrin, L. Independent cryptographic analysis of XSOC
     DSKAG amended construction. Technical report, University of Luxembourg
     Cryptography and Security Research Group, 2024. [TO VERIFY: exact
     publication venue and title; the fact of the analysis and the negative
     result are on the public record per XSOC documentation.]

[17] California Polytechnic State University, San Luis Obispo. Dieharder
     statistical test battery results for XSOC random number generation,
     440+ test runs. Independent validation report, 2024. [TO VERIFY: confirm
     whether a public report exists or this is referenced via XSOC published
     summary only.]

[18] George Mason University SENTINEL Laboratory. FP5223 audit of XSOC
     cryptographic stack. Findings report, December 2025.
     [TO VERIFY: confirm public citability; if proprietary to XSOC, cite as
     "on file with XSOC Corp" rather than as public reference.]

% Compliance and governance references

[19] National Institute of Standards and Technology. AI Risk Management
     Framework (AI RMF 1.0). NIST AI 100-1, January 2023.

[20] OWASP. Top 10 for LLM and Generative AI Applications, Agentic AI extension.
     2026 update. [TO VERIFY: confirm current document title and version.]

[21] International Organization for Standardization. ISO/IEC 42001:2023
     Information technology - Artificial intelligence - Management system.

[22] European Parliament and Council. Regulation (EU) 2024/1689 on harmonised
     rules on artificial intelligence (AI Act). Official Journal of the
     European Union, July 2024.

% OpenClaw public record primary sources

[23] Censys. OpenClaw exposure report: 135,000+ instances, 63 percent
     unauthenticated. Public analysis, February 2026. [TO VERIFY: exact title.]

[24] Koi Security. ClawHub marketplace audit: 341 malicious skills identified
     across 2,857 audited. ClawHavoc distribution campaign analysis.
     Public research report, 2026. [TO VERIFY: exact publication.]

[25] Hudson Rock. Infostealer targeting of OpenClaw data directories.
     Public threat advisory, 2026. [TO VERIFY.]

[26] National Vulnerability Database. CVE-2026-33579: OpenClaw pairing
     privilege escalation. CVSS 8.1-9.8.

[27] National Vulnerability Database. CVE-2026-32922: OpenClaw critical
     privilege escalation.

[28] Palo Alto Networks Unit 42. OpenClaw mapped to OWASP Top 10 for Agentic
     Applications. Public research, 2026. [TO VERIFY: exact title.]

% Memory and retrieval security

[29] Wang, B., He, W., Zeng, S., Xiang, Z., Xing, Y., Tang, J., and He, P.
     Unveiling privacy risks in LLM agent memory. In Proceedings of the 63rd
     Annual Meeting of the Association for Computational Linguistics
     (Volume 1: Long Papers), pp. 25241-25260, 2025.

[30] Dong, S., Xu, S., He, P., Li, Y., Tang, J., Liu, T., Liu, H., and Xiang, Z.
     A practical memory injection attack against LLM agents.
     arXiv:2503.03704, 2025.

% Additional jailbreak and prompt injection

[31] Bagdasaryan, E., Hsieh, T.-Y., Nassi, B., and Shmatikov, V. Abusing images
     and sounds for indirect instruction injection in multi-modal LLMs.
     arXiv:2307.10490, 2023.

[32] Shen, X., Chen, Z., Backes, M., Shen, Y., and Zhang, Y. "Do Anything Now":
     Characterizing and evaluating in-the-wild jailbreak prompts on large
     language models. In Proceedings of the 2024 ACM SIGSAC Conference on
     Computer and Communications Security, pp. 1671-1685, 2024.

[33] Hardy, N. The confused deputy: (or why capabilities might have been
     invented). ACM SIGOPS Operating Systems Review 22(4):36-38, 1988.

% Multi-agent dynamics

[34] Hammond, L., Chan, A., Clifton, J., Hoelscher-Obermaier, J., Khan, A.,
     McLean, E., Smith, C., Barfuss, W., Foerster, J., Gavenčiak, T., et al.
     Multi-agent risks from advanced AI. arXiv:2502.14143, 2025.

[35] Perolat, J., Leibo, J. Z., Zambaldi, V., Beattie, C., Tuyls, K., and
     Graepel, T. A multi-agent reinforcement learning model of common-pool
     resource appropriation. In Advances in Neural Information Processing
     Systems 30, 2017.

% Note on XSOC-specific references

% The XSOC QSIG and CGA preprints referenced in the paper are the prior
% XSOC publications with assigned Zenodo DOIs. Cite as:

[36] Blech, R. XSOC-QSIG (DSKAG-IT-SIG): Deterministic key agreement for
     post-quantum integrity-sealed sessions. Zenodo preprint,
     DOI 10.5281/zenodo.19457812, 2025.

[37] Blech, R. CGA specification: Companion specification to XSOC-QSIG.
     Zenodo preprint, DOI 10.5281/zenodo.19560238, 2025.
