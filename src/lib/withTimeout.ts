/** Evita promessas que nunca resolvem (rede, payload grande, etc.) de deixarem a UI presa. */
export function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number,
  timeoutMessage: string,
): Promise<T> {
  const settled = Promise.resolve(promise);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([settled, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
