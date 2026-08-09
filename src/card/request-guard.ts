/** Tracks in-flight async requests for one channel so stale responses can be ignored. */
export class RequestGuard {
  private requestId = 0;

  /** Invalidates any request currently tracked by this guard (e.g. on disconnect or config/session change). */
  invalidate(): void {
    this.requestId += 1;
  }

  /** Begins tracking a new request; `isCurrent()` stays true only while this exact request is still the latest. */
  begin(): { isCurrent: () => boolean } {
    const requestId = ++this.requestId;
    return { isCurrent: () => requestId === this.requestId };
  }
}
