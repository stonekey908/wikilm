---
type: concept
name: "Modular RAG"
tags: [rag, retrieval-augmented-generation, architecture, modularity, pipeline, agentic]
---

# Modular RAG

The third generation of [[retrieval-augmented-generation]] systems, which dissolves the fixed retrieve-then-generate pipeline into a set of interchangeable, composable modules. Modular RAG treats RAG as a configurable framework rather than a prescribed sequence, enabling different module combinations for different tasks, domains, and resource constraints.

## Core Idea

Where [[naive-rag]] and [[advanced-rag]] define a linear flow (index → retrieve → [process] → generate), Modular RAG defines a vocabulary of independent modules that can be assembled, reordered, parallelised, or swapped at configuration time. The analogy used in the literature is LEGO bricks: the same set of modules can be assembled into very different pipelines for very different tasks.

## Module Taxonomy

Common modules identified across the field (as summarised in [[rag-comprehensive-survey-2410-12837]]):

| Module Type | Function | Example Implementations |
|---|---|---|
| **Search / Retrieval** | Fetch documents from corpus | Dense retriever, sparse BM25, web search, SQL query |
| **Memory** | Maintain state across retrieval rounds | Conversation history, intermediate answer accumulation |
| **Routing** | Direct query to appropriate retrieval source | Domain classifier, query difficulty estimator |
| **Fusion** | Merge results from multiple retrieval sources | Reciprocal rank fusion, score normalisation |
| **Prediction / Generation** | Produce partial or full answers | LLM call with varying context levels |
| **Task Adapter** | Specialise pipeline for a downstream format | QA, summarisation, classification, code generation |
| **Critique / Verification** | Evaluate generated output quality | SELF-RAG critic, factuality checker |

## Notable Designs

- **IM-RAG ("inner monologue")** — alternates memory/prediction/retrieval modules in a reasoning loop; each generation step can trigger further retrieval
- **M-RAG (multi-agent RL)** — multiple specialised agents each operating a retrieval module, coordinated by a routing module
- **SELF-ROUTE** — a routing module assesses query difficulty and sends complex queries to retrieval while answering simpler ones from parametric memory
- **Graph RAG** — adds a graph traversal module to enable structured [[multi-hop-reasoning]] over knowledge graphs

## Strengths

- **Domain adaptability** — module combinations can be tailored to medical, legal, code, or general domains without retraining the generator
- **Interpretability** — distinct modules produce distinct traces, making debugging and audit easier
- **Extensibility** — new capabilities (e.g. web search, SQL, tool use) are added as new modules rather than architectural rewrites

## Limitations

- Modular designs can underperform tightly coupled hybrid systems on complex tasks because coordination overhead between loosely coupled modules introduces latency and potential information loss
- Module interfaces require careful design to avoid impedance mismatches (e.g. format or granularity differences between retrieval and generation modules)
- Testing and evaluation become harder: a pipeline of 5 modules has many possible failure configurations

## Relationship to Agentic RAG

Modular RAG blurs into **Agentic RAG** when the routing and prediction modules are replaced by an autonomous LLM agent that decides dynamically which modules to invoke, in what order, and how many times. Agentic RAG is the most recent evolution but inherits Modular RAG's component vocabulary.

## Sources

- [[rag-comprehensive-survey-2410-12837]] — §4 covers Modular RAG as the third evolutionary stage
- [[rag-comprehensive-survey-2506-00054]] — hybrid and robustness architectures reflect Modular RAG principles in the 2025 taxonomy
