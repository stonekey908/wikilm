---
type: concept
tags: [reinforcement-learning, AI, world-models, physical-AI, training, autonomous-systems]
---

# Reinforcement Learning

## Definition

Reinforcement learning (RL) is a training paradigm where an agent learns to make decisions by interacting with an environment, receiving rewards for desired behaviors and penalties for undesired ones. Unlike supervised learning (which trains on labeled examples), RL learns from the consequences of actions — optimizing a policy to maximize cumulative reward over time.

## Core Mechanism

1. **Agent**: The system being trained (a robot, vehicle controller, game-playing model)
2. **Environment**: The world the agent operates in (real or simulated)
3. **State**: The agent's current observation of the environment
4. **Action**: A choice the agent can make in a given state
5. **Reward**: A scalar signal indicating how good or bad the action was
6. **Policy**: The agent's learned mapping from states to actions

The learning loop: observe state → select action → receive reward → update policy → repeat.

## Integration with [[World-Models]]

World models dramatically accelerate RL training by providing **virtual environments** for policy learning:

- Instead of requiring millions of real-world interactions, agents train inside a world model's simulation
- World models generate photorealistic synthetic scenarios (edge cases, rare events, dangerous conditions) that would be impractical to collect in the real world
- [[nvidia-cosmos]] explicitly integrates RL with its world foundation model architecture; [[nvidia-world-models]] describes "chain-of-thought reasoning based on reinforcement learning" as the mechanism enabling [[world-models]] reasoning models to analyze multimodal inputs and determine optimal actions
- [[genie-3]] environments are designed for agent training via RL: [[sima-agents]] pursue multi-step goals in procedurally-generated worlds

This combination — RL policy optimization inside world model simulations — is the core training pipeline for modern [[physical-ai]] systems.

## Role in [[Physical-AI]]

RL is the **planning and control** layer in physical AI systems. The pipeline:

1. [[World-models]] understand physics and generate simulation environments
2. RL optimizes behavior policies within those environments
3. Policies transfer to real hardware via sim-to-real techniques
4. Continuous real-world experience refines policies further

Without RL, a world model is merely a passive simulator. RL transforms the simulation into a training signal.

## Key Challenges

- **Reward shaping**: Defining reward functions that capture intended behavior without unintended shortcuts (reward hacking)
- **Sample efficiency**: RL typically requires many more interactions than humans to learn comparable skills
- **Sim-to-real gap**: Policies learned in simulated world models may not transfer cleanly to real physics — a core challenge in [[robotics]] and [[autonomous-vehicles]]
- **Exploration vs. exploitation**: Balancing trying new behaviors (exploration) with repeating known good behaviors (exploitation)
- **Sparse rewards**: Many real tasks have no feedback until success or failure, making learning slow

## Applications

- **[[Autonomous-Vehicles]]**: Learning to navigate traffic, handle edge cases, optimize comfort/efficiency trade-offs
- **[[Robotics]]**: Manipulation, locomotion, human-robot interaction — policies learned in simulation and deployed to physical hardware
- **Game AI**: Canonical RL domain; DeepMind's AlphaGo/AlphaZero and OpenAI Five demonstrated superhuman performance
- **Finance**: Portfolio optimization, algorithmic trading (distinct from [[agentic-ai]] in banking, which is more planning-based)

## Related Concepts

- [[world-models]] — simulation substrate enabling efficient RL training
- [[physical-ai]] — the broader domain where RL-trained policies act in the real world
- [[autonomous-vehicles]] — primary application of RL + world models
- [[robotics]] — embodied RL domain requiring sim-to-real transfer
- [[agentic-ai]] — shares planning orientation; agentic systems sometimes use RL internally

## Sources

- [[nvidia-world-models]] — describes RL integration in world foundation model reasoning models and training pipelines
- [[physical-ai]] — RL as the planning layer in physical AI systems
