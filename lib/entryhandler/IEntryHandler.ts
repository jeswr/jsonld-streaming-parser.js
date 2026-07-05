import type { ParsingContext } from '../ParsingContext';
import type { Util } from '../Util';

/**
 * Handler for processing key-value pairs.
 */
export interface IEntryHandler<T> {

  /**
   * @return {boolean} If this can handle properties and generate predicates for them.
   */
  isPropertyHandler: () => boolean;

  /**
   * @return {boolean} If this handler should flag {@link ParsingContext#processingStack} for the given depth.
   *                   Handlers for things like @id, @context and @type return false, while prop handlers return true.
   */
  isStackProcessor: () => boolean;

  /**
   * Check if the given key is valid.
   *
   * This is called when validating parent keys.
   *
   * @param {ParsingContext} parsingContext A parsing context.
   * @param {Util} util A utility instance.
   * @param {any[]} keys A stack of keys.
   * @param {number} depth The current depth.
   * @param {boolean} inProperty If the current depth is part of a valid property node.
   * @return {boolean | Promise<boolean>} A boolean representing if the key is valid,
   *                                      possibly wrapped in a promise.
   *                                      Implementations SHOULD return the boolean directly
   *                                      when it can be determined synchronously,
   *                                      as this avoids Promise overhead on a hot path.
   */
  validate: (
    parsingContext: ParsingContext,
    util: Util,
    keys: any[],
    depth: number,
    inProperty: boolean,
  ) => boolean | Promise<boolean>;

  /**
   * Check if this handler can handle the given key.
   *
   * @param {ParsingContext} parsingContext A parsing context.
   * @param {Util} util A utility instance.
   * @param key The current (unaliased) key.
   * @param {any[]} keys A stack of keys.
   * @param {number} depth The current depth.
   * @return {T | null | Promise<T | null>} A truthy value if it can handle, possibly wrapped
   *                             in a promise.
   *                             (this value will be passed into {@link IEntryHandler#handle})
   *                             Implementations SHOULD return the value directly
   *                             when it can be determined synchronously,
   *                             as this avoids Promise overhead on a hot path.
   */
  test: (
    parsingContext: ParsingContext,
    util: Util,
    key: any,
    keys: any[],
    depth: number,
  ) => T | null | Promise<T | null>;

  /**
   * Handle the given entry.
   *
   * @param {ParsingContext} parsingContext A parsing context.
   * @param {Util} util A utility instance.
   * @param key The current (unaliased) key.
   * @param {any[]} keys A stack of keys.
   * @param value The value to handle.
   * @param {number} depth The current depth.
   * @param {T} testResult The test result from {@link IEntryHandler#test}.
   * @return {Promise<any>} A promise resolving when the handling is done.
   */
  handle: (
    parsingContext: ParsingContext,
    util: Util,
    key: any,
    keys: any[],
    value: any,
    depth: number,
    testResult: T,
  ) => Promise<any>;

}
