---
type: concept
tags: [generative-models, performance, latency, interactive-systems]
---

# Real-Time Generation

The ability to generate high-quality content (video, images, text) at interactive latencies — fast enough for real-time user interaction rather than offline batch processing. A critical requirement for [[world-models]] supporting agent training and interactive experiences.

## Definition

Real-time generation achieves:
- **Low Latency**: Sub-100ms generation per frame (typically targeting 24-60fps)
- **Responsiveness**: User actions (text prompts, mouse input, agent actions) reflected immediately
- **Throughput**: Sustaining generation across extended sessions (minutes to hours)
- **Quality**: Maintaining visual fidelity despite speed constraints

## The Latency Budget

For interactive [[video-generation]]:
- **24fps target**: ~42ms per frame
- **60fps target**: ~16ms per frame
- **Real-time agent control**: <100ms end-to-end (perception → decision → generation)

## Technical Challenges

1. **Computational Complexity**: Generative models are expensive; diffusion requires many steps
2. **Model Size**: Smaller models = faster inference, but lower quality
3. **Batch Processing**: Real-time systems can't wait for batch optimization
4. **Memory Bandwidth**: GPU memory constraints limit throughput

## Solutions & Optimizations

### Model Architecture
- Efficient tokenization (reducing spatial/temporal dimensions)
- Distilled diffusion models (fewer steps, same quality)
- Latent-space generation (cheaper than pixel-space)

### Hardware Acceleration
- Specialized inference chips (TPUs, specialized GPUs)
- Quantization and pruning for faster computation
- Parallel processing across multiple devices

### Algorithmic Efficiency
- [[genie-3]] approach: Frame-by-frame generation scaled to 720p, 24fps
- Streaming output (progressive refinement)
- Caching previously-generated content to avoid recomputation

## Contemporary Examples

**[[genie-3]]**: Achieves real-time interactivity at 24fps, 720p with full visual memory and action responsiveness. Represents a significant leap over prior [[world-models]] which typically operated at offline/batch speeds.

## Applications

- **Interactive World Generation**: [[genie-3]] for procedural environments
- **Game Development**: Real-time asset and world generation
- **Agent Training**: Agents interacting with live-generated environments
- **User-Facing Tools**: Text-to-image, sketch-to-image for creative workflows

## Tradeoffs

| Constraint | Impact | Tradeoff |
|-----------|--------|---------|
| Lower latency | Requires cheaper inference | May sacrifice quality |
| Higher quality | Requires more computation | May miss real-time targets |
| Longer contexts | Better consistency | More memory, slower per-frame |
| Larger models | Better generalization | Can't fit in memory for real-time |

## Sources

- [[genie-3-world-models]] — Google DeepMind's real-time world model at 24fps, 720p
