---
type: entity
entity_type: product
tags: [quantum error correction, deep learning, Google DeepMind, surface codes]
---

# AlphaQubit

Google DeepMind's neural-network-based quantum error correction decoder. Cited in [[ai-for-quantum-computing]] as a state-of-the-art example of transformer-based QEC decoding.

## Key Facts

- Designed to decode [[surface-codes]] at distance-9
- Required **2 billion training examples** to achieve high accuracy at that code distance — a significant data bottleneck highlighted as a limitation in the Nature Communications review
- Represents the category of transformer-based decoders that outperform classical minimum-weight perfect matching (MWPM)

## Significance

AlphaQubit demonstrates that transformer architectures can decode quantum errors better than the classical MWPM baseline. However, its training data requirements make it impractical for production deployment without synthetic data pipelines or transfer learning techniques.

## Connections

- [[ai-for-quantum-computing]] — source paper citing AlphaQubit as a case study
- [[quantum-error-correction]] — the problem AlphaQubit addresses
- [[surface-codes]] — the specific code family it decodes
- [[alphatensor-quantum]] — sibling Google DeepMind product for circuit compilation
