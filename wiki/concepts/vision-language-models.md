---
type: concept
tags: [vision-language-models, multimodal-AI, world-models, data-annotation, AI-foundations]
---

# Vision-Language Models

## Definition

Vision-language models (VLMs) are multimodal AI systems that jointly process and understand both visual data (images, video frames) and natural language. They learn shared representations across visual and linguistic modalities, enabling tasks like image captioning, visual question answering, and — critically for [[world-models]] — automated dataset annotation at scale.

## Core Architecture

VLMs combine:
- **Vision encoder**: Processes image or video frames into feature representations (typically a ViT or CNN backbone)
- **Language model**: Processes and generates text (transformer-based)
- **Cross-modal bridge**: Aligns visual and text representations so each modality can ground the other (attention mechanisms, projection layers)

Training uses large datasets of image-text pairs, teaching the model that a visual concept and a textual description are two expressions of the same underlying meaning.

## Role in [[World-Models]] Data Pipelines

[[nvidia-world-models]] identifies VLMs as critical for **data annotation and semantic understanding** in world model construction:

- World models require petabytes of visual data labeled with semantic information (object identities, depth, segmentation, motion)
- Manual annotation at this scale is infeasible; VLMs enable **automated captioning, classification, and quality filtering**
- The [[nvidia-world-models]] technical pipeline lists "Data Processing: filtering, annotation, classification, deduplication using vision-language models" as Step 1 before [[tokenization]] and foundation model training
- VLMs also support **quality control**: filtering low-quality frames, detecting distribution gaps in training data

This makes VLMs a prerequisite infrastructure layer for training state-of-the-art world foundation models like [[nvidia-cosmos]].

## Key Capabilities

- **Visual question answering**: Answer natural language questions about image/video content
- **Image captioning**: Generate descriptive text for visual inputs
- **Grounded detection**: Locate objects in images based on text descriptions
- **Semantic segmentation guidance**: Identify regions corresponding to text labels
- **Cross-modal retrieval**: Find images matching text queries (or vice versa)

## Relationship to Other Concepts

VLMs connect to several wiki domains:

- **[[World-models]]**: Data preprocessing — VLMs annotate the training corpora
- **[[Tokenization]]**: VLMs may use similar tokenization strategies; both convert high-dimensional visual data into compact representations
- **[[Physical-ai]]**: Physical AI systems use VLM-like multimodal understanding for real-time perception
- **[[Synthetic-user-modeling]]**: VLMs in UX research help interpret user-generated visual content

## Distinction from World Models

VLMs *understand* static images and language; [[world-models]] *simulate* physical dynamics over time. VLMs are a **tool used to build world models** (via annotation), not world models themselves. A VLM cannot predict "what will happen next in this scene" — that requires a world model's temporal and physics understanding.

## Sources

- [[nvidia-world-models]] — identifies VLMs as the data annotation layer in world foundation model training pipelines
- [[world-models]] — references VLMs as Step 1 in the technical pipeline for building world models
