const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function normalizeNotification(notification) {
  return {
    id: notification.id ?? notification.ID,
    type: notification.type ?? notification.Type,
    message: notification.message ?? notification.Message ?? '',
    createdAt: notification.createdAt ?? notification.Timestamp ?? notification.timestamp ?? new Date(0).toISOString(),
    isRead: notification.isRead ?? notification.read ?? false,
  };
}

function toTimestamp(notification) {
  const time = new Date(notification.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function scoreNotification(notification) {
  const normalized = normalizeNotification(notification);
  const weight = TYPE_WEIGHT[normalized.type] ?? 0;
  const timestamp = toTimestamp(normalized);

  return weight * 1_000_000_000_000 + timestamp;
}

function compareByPriority(left, right) {
  const scoreDiff = scoreNotification(left) - scoreNotification(right);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return toTimestamp(left) - toTimestamp(right);
}

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0] ?? null;
  }

  push(value) {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(value) {
    this.items[0] = value;
    this.bubbleDown(0);
  }

  bubbleUp(index) {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(this.items[current], this.items[parent]) >= 0) {
        break;
      }

      [this.items[current], this.items[parent]] = [this.items[parent], this.items[current]];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;

    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;

      if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }

      if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
      current = smallest;
    }
  }
}

export function getTopPriorityNotifications(notifications, limit = 10) {
  const heap = new MinHeap(compareByPriority);

  for (const notification of notifications) {
    const normalized = normalizeNotification(notification);

    if (!normalized.id) {
      continue;
    }

    if (heap.size() < limit) {
      heap.push(normalized);
      continue;
    }

    const weakest = heap.peek();
    if (weakest && compareByPriority(normalized, weakest) > 0) {
      heap.replaceRoot(normalized);
    }
  }

  return heap.items
    .slice()
    .sort((left, right) => compareByPriority(right, left));
}
