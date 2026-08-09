import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

type SwiperDirection = 'vertical' | 'horizontal';

interface SwiperRecord {
  element: HTMLElement;
  instance: Swiper;
  direction: SwiperDirection;
}

export class CardSwiperManager {
  private readonly records = new Map<string, SwiperRecord>();

  mount(root: ParentNode, selector = '[data-swiper]', direction: SwiperDirection = 'vertical'): void {
    const elements = new Map<string, HTMLElement>();
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      const key = element.dataset.swiper;
      if (key) elements.set(key, element);
    }

    for (const [key, record] of this.records) {
      const element = elements.get(key);
      if (element !== record.element) {
        record.instance.destroy(true, true);
        this.records.delete(key);
      }
    }

    for (const [key, element] of elements) {
      const nextDirection = this.getDirection(element, direction);
      const current = this.records.get(key);
      if (current?.element === element) {
        if (current.direction !== nextDirection) {
          current.instance.changeDirection(nextDirection);
          current.direction = nextDirection;
        }
        continue;
      }
      this.records.set(key, {
        element,
        direction: nextDirection,
        instance: new Swiper(element, {
          direction: nextDirection,
          modules: [FreeMode, Mousewheel],
          freeMode: true,
          mousewheel: true,
          resistance: true,
          watchOverflow: true,
          slidesPerView: 'auto',
        }),
      });
    }
  }

  private getDirection(element: HTMLElement, fallback: SwiperDirection): SwiperDirection {
    if (element.dataset.swiperDirection === 'horizontal') return 'horizontal';
    if (
      element.dataset.swiperResponsive === 'horizontal' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 680px)').matches
    )
      return 'horizontal';
    return fallback;
  }

  destroy(): void {
    for (const record of this.records.values()) record.instance.destroy(true, true);
    this.records.clear();
  }
}
