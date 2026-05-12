import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const lines = execSync(
  "find node_modules -path '*/@radix-ui/*/dist/index.mjs' -o -path '*/@radix-ui/*/dist/index.js'",
  { stdio: ["ignore", "pipe", "ignore"] }
)
  .toString("utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

for (const file of lines) {
  const src = readFileSync(file, "utf8");
  const next = src
    .replace(
      /\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*=>\s*set([A-Za-z0-9_]+)\(\1\)/g,
      "set$2"
    )
    .replace(
      /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*set([A-Za-z0-9_]+)\(\1\)/g,
      "set$2"
    )
    .replace(
      /const composedRefs = (useComposedRefs|\(0, import_react_compose_refs\.useComposedRefs\))\(\s*forwardedRef,\s*\(node\) => contentContext\.itemRefCallback\?\.\(node, value, disabled\)\s*\);/g,
      [
        "const itemRefCallback = React.useCallback(",
        "      (node) => contentContext.itemRefCallback?.(node, value, disabled),",
        "      [contentContext.itemRefCallback, value, disabled]",
        "    );",
        "    const composedRefs = $1(forwardedRef, itemRefCallback);",
      ].join("\n")
    )
    .replace(
      /const composedRefs = (useComposedRefs|\(0, import_react_compose_refs\.useComposedRefs\))\(\s*forwardedRef,\s*setItemTextNode,\s*itemContext\.onItemTextChange,\s*\(node\) => contentContext\.itemTextRefCallback\?\.\(node, itemContext\.value, itemContext\.disabled\)\s*\);/g,
      [
        "const itemTextRefCallback = React.useCallback(",
        "      (node) => contentContext.itemTextRefCallback?.(node, itemContext.value, itemContext.disabled),",
        "      [contentContext.itemTextRefCallback, itemContext.value, itemContext.disabled]",
        "    );",
        "    const composedRefs = $1(",
        "      forwardedRef,",
        "      setItemTextNode,",
        "      itemContext.onItemTextChange,",
        "      itemTextRefCallback",
        "    );",
      ].join("\n")
    );
  if (next !== src) writeFileSync(file, next, "utf8");
}
