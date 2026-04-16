---
type: concept
tags: [world-models, generative-models, coherence, temporal-consistency]
---

# Environmental Consistency

The ability of a generative model to maintain coherent, unchanging properties of objects, places, and physics across an extended sequence of frames or interactions. A key challenge in [[video-generation]] and [[world-models]].

## Definition

Environmental consistency means:
- **Spatial Consistency**: Objects retain their position, size, and appearance when they move off-screen and return
- **Physical Consistency**: Physics laws (gravity, momentum, collision) apply uniformly
- **Temporal Consistency**: The same location looks the same when revisited; object relationships remain stable
- **Semantic Consistency**: Objects maintain their identity and properties

## The Problem

Generative models naturally struggle with consistency because:
- Each frame is generated independently (or with limited context)
- **Long-range dependencies** are computationally expensive to model
- Models may "forget" previously-rendered details when generating new frames
- Cumulative errors can grow over extended sequences

## Solutions & Approaches

### Explicit Memory
- Tracking previously-rendered frames and locations
- Maintaining 3D representations or object atlases
- Using key-value caches for object properties

### Implicit Learning
- Training models on long sequences to learn consistency patterns
- [[genie-3]]'s approach: Implicit visual memory up to **1 minute** of history
- Emergent property: Model learns to preserve coherence without explicit 3D models

### Hybrid Approaches
- Combining learned consistency with structured representations
- ControlNet-style conditioning to enforce structural consistency

## Relation to [[World-Models]]

Environmental consistency is essential for [[world-models]] because:
- Agents need to navigate and interact with stable worlds
- "What-if" simulations require internally-consistent branching timelines
- Users expect revisited locations to appear as they left them

## Emergent vs. Explicit

**[[genie-3]]'s Key Innovation**: Achieves ~1-minute visual memory and environmental consistency **without explicit 3D representations**. This suggests:
- Neural networks can learn implicit spatial structure at scale
- Long-range consistency can emerge from large-scale video training
- Generative models may be sufficient for world simulation without hand-crafted 3D engines

## Implications

- Generative models approaching the coherence guarantees of physics engines
- Potential for purely learned simulation without explicit rules
- Raises questions about how implicit representations handle edge cases

## Sources

- [[genie-3-world-models]] — Google DeepMind's real-time world model with 1-minute visual memory
