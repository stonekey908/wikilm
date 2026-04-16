---
type: source
title: "Genie 3: A new frontier for world models"
author: "Google DeepMind"
date: "2026-04-16"
source_url: "https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/"
tags: [world-models, deepmind, generative, video-generation, agents, real-time]
---

# Genie 3: A new frontier for world models

[[google-deepmind]]'s research announcement of Genie 3, a large-scale [[world-models|world model]] capable of generating diverse, interactive environments from text prompts and single images. Represents a major advance in [[video-generation]] and [[real-time-generation]] with emergent capabilities in [[environmental-consistency]].

## Key Capabilities

### Real-Time Interactivity
- Generates dynamic, navigable worlds at **24 frames per second in 720p resolution**
- Processes user inputs multiple times per second while tracking previously-generated trajectories
- Maintains coherence and consistency during extended interaction

### Environmental Consistency (Emergent)
- **Visual memory extending up to 1 minute** into the past
- Objects and landscapes remain coherent as users revisit locations
- Achieved without explicit 3D representations — an emergent property of the generative model
- Frame-by-frame generation based on world description and user actions

### Demonstrated Phenomena
- Physical interactions (water, lighting, environmental dynamics)
- Natural ecosystem simulation with animal behavior patterns
- Fantastical animation and fictional world scenarios
- Historical and geographical location exploration
- Promptable world events (weather changes, dynamic object introduction)

## Technical Approach

Unlike traditional [[video-generation]] methods (NeRF, Gaussian Splatting), Genie 3:
- Generates worlds **frame by frame** based on world description and user actions
- Implicitly maintains spatial coherence without explicit 3D models
- Enables real-time interaction while preserving environmental state

## Limitations (Acknowledged)

- Restricted agent action spaces (limited interaction vocabularies)
- Difficulty simulating multiple independent agents simultaneously
- Imperfect geographic accuracy for real locations
- Poor text rendering capability
- Limited interaction duration (minutes rather than hours)

## Agent Training Applications

- Tested with [[sima-agents]] pursuing complex multi-step goals
- Supports longer action sequences for advanced AI training scenarios
- Potential to scale [[agentic-ai]] research with diverse, procedurally-rich environments

## Connection to Adjacent Concepts

Genie 3 bridges [[world-models]], [[video-generation]], and [[agent-training]] — enabling both the creation of diverse interactive environments and the advancement of autonomous agent capabilities. The emergent [[environmental-consistency]] without explicit 3D representation is particularly notable as it suggests generative models can learn implicit physics and spatial reasoning at scale.

## Sources

- [[google-deepmind]] research blog announcement, April 16, 2026
