import json
import os
from pathlib import Path
from graphify.detect import detect, save_manifest
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

# Step 1: Detect files
print("Step 1: Detecting files...")
result = detect(Path('.'))
print(f"Corpus: {result['total_files']} files, {result['total_words']} words")

# Step 2: Extract AST
print("\nStep 2: Extracting AST...")
code_files = []
for f in result.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    ast_result = extract(code_files)
    print(f"AST: {len(ast_result['nodes'])} nodes, {len(ast_result['edges'])} edges")
else:
    ast_result = {'nodes':[], 'edges':[], 'input_tokens':0, 'output_tokens':0}
    print("No code files - skipping AST extraction")

# Step 3: Create semantic graph
print("\nStep 3: Creating semantic graph...")
semantic_nodes = [
    {"id": "AGENTS_md", "label": "AGENTS.md - Graphify integration rules", "file_type": "document", "source_file": "AGENTS.md"},
    {"id": "API_FRONTEND_ADJUSTMENT_REPORT_md", "label": "API Frontend Adjustment Report", "file_type": "document", "source_file": "API_FRONTEND_ADJUSTMENT_REPORT.md"},
    {"id": "CLAUDE_md", "label": "CLAUDE.md - Project guidelines", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "Frontend_interface_api_store_guard_request_md", "label": "Frontend API Interface Document", "file_type": "document", "source_file": "Frontend_interface_api_store_guard_request.md"},
    {"id": "README_md", "label": "README - Project documentation", "file_type": "document", "source_file": "README.md"},
    {"id": "知识图谱分析报告_md", "label": "知识图谱分析报告", "file_type": "document", "source_file": "知识图谱分析报告.md"},
    {"id": "index_html", "label": "index.html - Entry point", "file_type": "document", "source_file": "index.html"},
    {"id": "Vue3", "label": "Vue 3 Framework", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "TypeScript", "label": "TypeScript Language", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "Pinia", "label": "Pinia State Management", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "ElementPlus", "label": "Element Plus UI Library", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "Django", "label": "Django Backend Framework", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "createEntityStore", "label": "createEntityStore Factory", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "CommonList", "label": "CommonList Component", "file_type": "document", "source_file": "CLAUDE.md"},
    {"id": "Graphify", "label": "Graphify Knowledge Graph", "file_type": "document", "source_file": "AGENTS.md"}
]

semantic_edges = [
    {"source": "AGENTS_md", "target": "Graphify", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "AGENTS.md"},
    {"source": "CLAUDE_md", "target": "Vue3", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "TypeScript", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "Pinia", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "ElementPlus", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "Django", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "createEntityStore", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "CLAUDE_md", "target": "CommonList", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": "CLAUDE.md"},
    {"source": "API_FRONTEND_ADJUSTMENT_REPORT_md", "target": "createEntityStore", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.8, "source_file": "API_FRONTEND_ADJUSTMENT_REPORT.md"},
    {"source": "Frontend_interface_api_store_guard_request_md", "target": "createEntityStore", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.7, "source_file": "Frontend_interface_api_store_guard_request.md"}
]

semantic_result = {
    'nodes': semantic_nodes,
    'edges': semantic_edges,
    'hyperedges': [],
    'input_tokens': 0,
    'output_tokens': 0
}

# Step 4: Merge AST and semantic
print("\nStep 4: Merging AST and semantic...")
seen = {n['id'] for n in ast_result['nodes']}
merged_nodes = list(ast_result['nodes'])
for n in semantic_result['nodes']:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

merged_edges = ast_result['edges'] + semantic_result['edges']
merged_hyperedges = semantic_result.get('hyperedges', [])
merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': merged_hyperedges,
    'input_tokens': semantic_result.get('input_tokens', 0),
    'output_tokens': semantic_result.get('output_tokens', 0),
}
print(f"Merged: {len(merged_nodes)} nodes, {len(merged_edges)} edges ({len(ast_result['nodes'])} AST + {len(semantic_result['nodes'])} semantic)")

# Step 5: Build graph
print("\nStep 5: Building graph...")
G = build_from_json(merged)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': merged.get('input_tokens', 0), 'output': merged.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)

# Step 6: Generate outputs
print("\nStep 6: Generating outputs...")
os.makedirs('graphify-out', exist_ok=True)

report = generate(G, communities, cohesion, labels, gods, surprises, result, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report)
to_json(G, communities, 'graphify-out/graph.json')

# Step 7: Generate HTML
print("Step 7: Generating HTML...")
if G.number_of_nodes() > 5000:
    print(f"Graph has {G.number_of_nodes()} nodes - too large for HTML viz")
else:
    to_html(G, communities, 'graphify-out/graph.html', community_labels=labels or None)
    print("graph.html written - open in any browser, no server needed")

print("\nGraph complete! Outputs in graphify-out/")