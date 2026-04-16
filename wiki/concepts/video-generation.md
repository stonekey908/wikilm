---
type: concept
tags: [generative-models, visual-ai, multimodal, synthesis]
---

# Video Generation

The task of generating video sequences from text descriptions, images, or other conditioning signals. Video generation combines spatial coherence (within-frame realism) with temporal coherence (frame-to-frame consistency).

## Definition

Video generation is the synthesis of sequences of image frames that:
- Follow a text description or prompt
- Extend from an initial image
- Respond to user actions or control signals
- Maintain visual and physical coherence across frames

## Key Challenges

- **Temporal Coherence**: Preventing flicker, discontinuities, and unnatural motion between frames
- **Semantic Consistency**: Objects maintaining identity, position, and properties across time
- **Computational Efficiency**: Generating at reasonable latencies (real-time or near real-time)
- **Visual Realism**: High-resolution, photorealistic quality across diverse scenarios
- **Generalization**: Handling diverse genres (realistic, fantastical, abstract)

## Technical Approaches

- **Diffusion Models**: Iterative refinement from noise to coherent video
- **Autoregressive Models**: Predicting next frame conditioned on previous frames
- **Latent Space Generation**: Generating in compressed token/latent space for efficiency
- **Flow-Based Models**: Predicting optical flow and combining with warping

## Contemporary Examples

- **[[genie-3]]** — Real-time interactive video generation at 24fps with action conditioning
- Text-to-video models (Runway, Pika, OpenAI Sora) — generating from text prompts
- Frame interpolation models — filling gaps between keyframes
- Conditional video synthesis — guided by depth maps, segmentation, or user sketches

## Applications

- **Interactive World Generation**: [[genie-3]] for agent training and game-like environments
- **Creative Tools**: Rapid prototyping of visual ideas from text
- **Data Synthesis**: Generating synthetic training data for perception models
- **Animation Production**: Accelerating animation workflows
- **Content Creation**: Generating variations and alternatives for visual content

## Relationship to [[World-Models]]

Video generation is a core capability of [[world-models]]. While world models encompass full environmental understanding and interactivity, video generation focuses specifically on the quality and realism of generated visual sequences.

[[genie-3]] extends video generation by adding:
- Real-time responsiveness to user actions
- Extended visual memory and coherence
- Emergent [[environmental-consistency]]

## Sources

- [[genie-3-world-models]] — Google DeepMind real-time interactive video generation system
