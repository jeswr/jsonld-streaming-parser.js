import type { JsonLdContextNormalized } from 'jsonld-context-parser';

/**
 * A context lookup result, exposing the context promise and,
 * when it has already settled, its resolved value.
 */
export interface IContextTreeEntry {
  context: Promise<JsonLdContextNormalized>;
  resolved: JsonLdContextNormalized | null;
  depth: number;
}

/**
 * A tree structure that holds all contexts,
 * based on their position in the JSON object.
 *
 * Positions are identified by a path of keys.
 */
export class ContextTree {
  private readonly subTrees: Record<string, ContextTree> = {};
  private context: Promise<JsonLdContextNormalized> | null = null;
  // The resolved value of `context`, once (and only while) it is known.
  private contextResolved: JsonLdContextNormalized | null = null;

  /**
   * Find the deepest node holding a context along `keys[index..end)`, together with its depth.
   *
   * This iterative walk performs no allocations,
   * and exposes the already-resolved context value when it is known,
   * which allows callers to avoid Promise churn on hot paths.
   *
   * @param keys The path of keys to look along.
   * @param index The inclusive lower bound within `keys` to start walking from (defaults to 0).
   * @param end The exclusive upper bound within `keys` to walk (defaults to `keys.length`).
   * @return {IContextTreeEntry | null} The deepest context entry at or above the path, if any.
   */
  public lookup(keys: string[], index = 0, end: number = keys.length): IContextTreeEntry | null {
    // eslint-disable-next-line ts/no-this-alias
    let node: ContextTree = this;
    let found: ContextTree | null = this.context ? this : null;
    let foundDepth = 0;
    let depth = 0;
    for (let i = index; i < end; i++) {
      const subTree: ContextTree | undefined = node.subTrees[keys[i]];
      if (!subTree) {
        break;
      }
      node = subTree;
      depth++;
      if (node.context) {
        found = node;
        foundDepth = depth;
      }
    }
    return found ? { context: found.context!, resolved: found.contextResolved, depth: foundDepth } : null;
  }

  public getContext(keys: string[], index = 0): Promise<{ context: JsonLdContextNormalized; depth: number }> | null {
    const entry = this.lookup(keys, index);
    if (!entry) {
      return null;
    }
    if (entry.resolved) {
      return Promise.resolve({ context: entry.resolved, depth: entry.depth });
    }
    return entry.context.then(context => ({ context, depth: entry.depth }));
  }

  /**
   * Synchronously check whether {@link #getContext} would return a context (i.e. a non-null value)
   * for the given path.
   *
   * This is a pure boolean mirror of {@link #getContext}'s non-null semantics. It is used for
   * truthiness tests where only the *presence* of a context matters, avoiding the intermediate
   * Promise (and its `.then` closure) that {@link #getContext} allocates for that check.
   *
   * @param keys The path of keys to check.
   * @param index The current offset into `keys` (defaults to 0).
   * @param end The exclusive upper bound within `keys` to walk (defaults to `keys.length`).
   * @return {boolean} True if a context exists at or above the given path.
   */
  public hasContext(keys: string[], index = 0, end: number = keys.length): boolean {
    return this.lookup(keys, index, end) !== null;
  }

  public setContext(
    keys: any[],
    context: Promise<JsonLdContextNormalized> | JsonLdContextNormalized | null,
  ): void {
    // eslint-disable-next-line ts/no-this-alias
    let node: ContextTree = this;
    for (const key of keys) {
      let subTree = node.subTrees[key];
      if (!subTree) {
        subTree = node.subTrees[key] = new ContextTree();
      }
      node = subTree;
    }
    if (context && typeof (<Promise<JsonLdContextNormalized>>context).then !== 'function') {
      // An already-resolved context can be recorded synchronously.
      node.context = Promise.resolve(<JsonLdContextNormalized>context);
      node.contextResolved = <JsonLdContextNormalized>context;
    } else {
      const contextPromise = <Promise<JsonLdContextNormalized> | null>context;
      node.context = contextPromise;
      node.contextResolved = null;
      if (contextPromise) {
        // Record the resolved value (only if the slot still holds this exact promise),
        // so that later lookups can access it without going through the microtask queue.
        // Rejections are left to be handled by whoever consumes the context promise.
        contextPromise.then((value) => {
          if (node.context === contextPromise) {
            node.contextResolved = value;
          }
        }, () => {
          // Ignored: the consumer of the context promise is responsible for error handling.
        });
      }
    }
  }

  public removeContext(path: string[]): void {
    this.setContext(path, null);
  }
}
