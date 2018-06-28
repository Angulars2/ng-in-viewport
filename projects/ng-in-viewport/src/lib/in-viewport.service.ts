import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { InViewportConfig } from './in-viewport-config';

export interface InViewportRegistryEntry {
  root: Element;
  targets: Set<Element>;
  observer: IntersectionObserver;
}

export type InViewportTrigger = Subject<IntersectionObserverEntry>;
export type InViewportRegistry = InViewportRegistryEntry[];

@Injectable({
  providedIn: 'root'
})
export class InViewportService {
  public readonly trigger$: InViewportTrigger = new Subject<IntersectionObserverEntry>();
  private registry: InViewportRegistry = [];

  constructor(private ngZone: NgZone) {}

  private emitTrigger(entries: IntersectionObserverEntry[]) {
    if (Array.isArray(entries) && entries.length) {
      entries.forEach((entry) => this.trigger$.next(entry));
    }
  }

  private getRootElement(element?: Element) {
    return element && element.nodeType === Node.ELEMENT_NODE ? element : undefined;
  }

  private findEntry(root: Element) {
    return this.registry.find((entry) => entry.root === this.getRootElement(root));
  }

  public register(target: Element, config: InViewportConfig): void {
    this.ngZone.runOutsideAngular(() => {
      const foundedEntry = this.findEntry(config.root);
      if (foundedEntry && !foundedEntry.targets.has(target)) {
        foundedEntry.targets.add(target);
        foundedEntry.observer.observe(target);
      } else {
        const options: any = {
          root: this.getRootElement(config.root),
          rootMargin: config.rootMargin,
          threshold: config.threshold
        };
        const entry: InViewportRegistryEntry = {
          root: this.getRootElement(config.root),
          targets: new Set([target]),
          observer: new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => this.ngZone.run(() => this.emitTrigger(entries)),
            options
          )
        };
        entry.observer.observe(target);
        this.registry = [...this.registry, entry];
      }
    });
  }

  public unregister(target: Element, config: InViewportConfig): void {
    this.ngZone.runOutsideAngular(() => {
      const foundedEntry = this.findEntry(config.root);
      if (foundedEntry) {
        const { observer, targets } = foundedEntry;
        if (targets.has(target)) {
          observer.unobserve(target);
          targets.delete(target);
        }
        if (targets.size === 0) {
          observer.disconnect();
          this.registry = this.registry.filter((entry) => entry !== foundedEntry);
        }
      }
    });
  }
}