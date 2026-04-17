---
type: concept
tags: [autonomous-vehicles, physical-AI, world-models, robotics, simulation, safety]
---

# Autonomous Vehicles

## Definition

Autonomous vehicles (AVs) are ground vehicles capable of sensing their environment and navigating without human input. AV development is one of the most demanding applications of [[physical-ai]], requiring reliable perception, prediction, planning, and control in open-world environments with safety-critical stakes.

## The Core Pipeline

AV systems operate through a sequential pipeline:

### 1. Perception
Multimodal sensors (cameras, LiDAR, radar, ultrasonic) capture the environment. Raw sensor data is processed to identify:
- Road geometry and lane markings
- Traffic signals and signs
- Other vehicles, pedestrians, cyclists
- Weather and lighting conditions

### 2. Prediction
Given the perceived environment, the system predicts what other agents (vehicles, pedestrians) will do next. This is where [[world-models]] are most impactful: rather than rule-based prediction, modern approaches use learned world models to simulate likely futures across a distribution of scenarios.

### 3. Planning
A trajectory is computed that achieves the vehicle's goal (navigation) while satisfying constraints (safety margins, traffic laws, ride comfort). Planning must handle uncertainty in both perception and prediction.

### 4. Control
Low-level commands (steering angle, throttle, brake) execute the planned trajectory. Control loops run at high frequency (50–100Hz) with sub-100ms latency requirements.

## Why World Models Are Central

[[nvidia-world-models]] names autonomous vehicles as the **primary application** of world foundation models:

- **Scenario diversity**: Real-world data collection cannot efficiently cover rare edge cases (sudden pedestrian entry, sensor occlusion, unusual weather). World models generate unlimited synthetic scenarios for training
- **Safety validation**: Testing safety-critical behaviors in simulation is cheaper and safer than real-world testing. NVIDIA's estimate: millions of simulation hours needed, versus impossibly expensive real-world equivalents
- **Data augmentation**: World models perform "domain randomization" — varying lighting, weather, road surfaces — to improve perception robustness
- [[nvidia-cosmos]] is specifically designed for autonomous vehicle training: high-fidelity physics simulation, photorealistic rendering, multi-sensor synthesis

The sim-to-real gap — where behaviors learned in simulation fail on real roads — remains the central unsolved challenge. World model fidelity (how accurately physics, lighting, and agent behavior are simulated) directly determines how well simulated training transfers.

## Relationship to [[Reinforcement-Learning]]

AV planning policies are increasingly trained via [[reinforcement-learning]] inside world model simulations:
- RL agent receives reward for safe, efficient navigation
- World model provides the environment, physics, and other-agent behaviors
- Policies trained this way generalize better than hand-coded rule systems

## Relationship to [[Physical-AI]]

Autonomous vehicles are the highest-profile application of [[physical-ai]]. They require the full stack:
- **Perception** (multimodal sensor fusion)
- **World understanding** ([[world-models]] for prediction)
- **RL-based planning** ([[reinforcement-learning]])
- **Real-time control** (<100ms decision cycles)
- **Safety guarantees** in open-world conditions

## Industry Context

As of 2026, autonomous vehicles are in commercial deployment in limited geofenced areas (robotaxis in select US cities). Full open-world Level 4/5 autonomy remains unsolved. Key technical gaps:
- Long-tail edge cases (novel scenarios not seen in training)
- Reliable perception in adverse weather
- Social norm understanding (merging, negotiation with human drivers)
- Regulatory certification pathways

## Related Concepts

- [[world-models]] — simulation and training environment for AV perception/planning systems
- [[physical-ai]] — overarching framework; AVs are the flagship [[physical-ai]] application
- [[reinforcement-learning]] — planning policy optimization inside world model simulations
- [[robotics]] — parallel domain; shares sim-to-real challenges and world model training approaches
- [[digital-twin]] — AV development uses digital twins of road networks and vehicle hardware

## Sources

- [[nvidia-world-models]] — identifies autonomous vehicles as primary world model application with specific simulation requirements
- [[physical-ai]] — autonomous vehicles as core [[physical-ai]] application alongside robotics
