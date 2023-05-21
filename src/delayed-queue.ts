// DelayQueue emits events again after a certain period of delay, events can be canceled in the queue by either their group,
// or by the event ID.
export class DelayedQueue<T> {
  private active = false;
  private timeout?: ReturnType<typeof setTimeout>;
  private activeIds = new Set<string>();
  private idToGroup = new Map<string, string>();
  private groupToIds: Record<string, Set<string>> = {};
  private queue: { id: string; group: string; item: T; emitAt: number }[] = [];

  constructor(
    private delayMs: number,
    private idResolver: (item: T) => string,
    private groupResolver: (item: T) => string,
    private delayedCallback: (item: T) => void,
  ) {}

  cleanup() {
    this.timeout !== undefined && clearTimeout(this.timeout);
    this.queue = [];
    this.active = false;
  }

  evictEvent(id: string) {
    // disable event
    this.activeIds.delete(id);

    // clean up indexes early
    const group = this.idToGroup.get(id);
    if (group) {
      const set = this.groupToIds[group];
      if (set) {
        // cleanup key from set, if the set is empty, also gc it.
        set.delete(id);
        set.size === 0 && delete this.groupToIds[group];
      }
    }

    this.idToGroup.delete(id);
  }

  evictAllEventsInGroup(group: string) {
    const set = this.groupToIds[group];
    delete this.groupToIds[group];
    if (!set) return;

    set.forEach((id) => {
      console.info(`Evicting group ${group} from delay queue, id: ${id}`);
      this.activeIds.delete(id);
      this.idToGroup.delete(id);
      set.delete(id);
    });
  }

  cancelEvent(id: string) {
    // when this event no longer exists in the set, when it comes to that item in the queue, it'll be skipped
    this.activeIds.delete(id);
  }

  push(item: T) {
    const id = this.idResolver(item);
    const group = this.groupResolver(item);

    // build indexes
    this.activeIds.add(id);
    this.idToGroup.set(id, group);
    this.groupToIds[group] ? this.groupToIds[group].add(id) : (this.groupToIds[group] = new Set([id]));

    this.queue.push({ id: id, group: group, item: item, emitAt: Date.now() + this.delayMs });
    !this.active && this.start();
  }

  private start() {
    this.active = true;
    this.awaitNextEmit();
  }

  private awaitNextEmit() {
    const item = this.queue.shift();
    if (!item) {
      // queue is complete, deactivate and wait for next event
      this.active = false;
      this.timeout = undefined;
      return;
    }

    if (!this.activeIds.has(item.id)) {
      console.info(`Event ${item.id} got evicted, skipping.`);
      // this item got canceled, skip.
      this.awaitNextEmit();
      return;
    }

    const delta = item.emitAt - Date.now();
    if (delta <= 0) {
      // we're behind, immediately emit and wait for next item
      return this.pushAndAwait(item);
    }

    this.timeout = setTimeout(() => this.pushAndAwait(item), delta);
  }

  private pushAndAwait(item: (typeof this.queue)[number]) {
    // only emit if the id hasn't been canceled, but always try to await the next item
    this.activeIds.has(item.id) && this.delayedCallback(item.item);

    // cleanup from indexes
    this.activeIds.delete(item.id);
    this.idToGroup.delete(item.id);
    const groupSet = this.groupToIds[item.group];
    if (groupSet) {
      groupSet.delete(item.id);
      groupSet.size === 0 && delete this.groupToIds[item.group];
    }

    this.awaitNextEmit();
  }
}
